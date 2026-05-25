"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { withAudit } from "@/server/with-audit";
import { TAGS_ON_FACTURE_CHANGE } from "@/server/cache-tags";

function invalidateFactureCaches() {
  for (const tag of TAGS_ON_FACTURE_CHANGE) revalidateTag(tag);
}
import {
  computeFactureTotals,
  factureBrouillonCreateSchema,
  factureBrouillonUpdateSchema,
  ligneLibreSchema,
  type FactureBrouillonCreate,
  type FactureBrouillonUpdate,
  type LigneLibre
} from "@/lib/validators/facture";

function parseLignesLibres(raw: string | null | undefined): LigneLibre[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => ligneLibreSchema.safeParse(x))
      .filter((r) => r.success)
      .map((r) => (r as { data: LigneLibre }).data);
  } catch {
    return [];
  }
}

/**
 * Recharge une facture brouillon + ses séances + ses lignes libres,
 * puis recalcule HT/TVA/TTC et synchronise en base.
 */
async function recomputeAndPersist(id: string) {
  const facture = await prisma.facture.findUnique({
    where: { id },
    include: { seances: { select: { tarif: true } } }
  });
  if (!facture) throw new Error("Facture introuvable");
  const lignes = parseLignesLibres(facture.lignesLibres);
  const totals = computeFactureTotals({
    seances: facture.seances,
    lignesLibres: lignes,
    tva: facture.tva,
    acompte: facture.acompte
  });
  return prisma.facture.update({
    where: { id },
    data: { montantHT: totals.montantHT, montantTTC: totals.montantTTC }
  });
}

export async function listFactures() {
  return prisma.facture.findMany({
    orderBy: { dateEmission: "desc" },
    include: { patient: true, _count: { select: { seances: true } } }
  });
}

export async function getFacture(id: string) {
  return prisma.facture.findUnique({
    where: { id },
    include: { patient: true, seances: { orderBy: { date: "asc" } } }
  });
}

/**
 * Renvoie les séances HONOREE non encore facturées pour un patient — utiles pour
 * proposer l'ajout au brouillon. Optionnel : limite côté UI à 50.
 */
export async function getSeancesFacturablesPatient(patientId: string) {
  return prisma.seance.findMany({
    where: { patientId, statut: "HONOREE", factureId: null },
    orderBy: { date: "asc" },
    take: 50
  });
}

/**
 * Crée un brouillon de facture à partir d'une sélection de séances HONOREE non encore facturées.
 * Le numéro est temporaire jusqu'à émission.
 */
export async function createFactureBrouillon(input: FactureBrouillonCreate) {
  const parsed = factureBrouillonCreateSchema.parse(input);

  const seances = await prisma.seance.findMany({
    where: { id: { in: parsed.seanceIds }, patientId: parsed.patientId, factureId: null }
  });
  if (seances.length === 0) throw new Error("Aucune séance facturable sélectionnée");

  const montantHT = seances.reduce((acc, s) => acc + s.tarif, 0);
  const tva = parsed.tva ?? 0;
  const montantTTC = montantHT * (1 + tva / 100);

  const numeroBrouillon = `BR-${Date.now().toString(36).toUpperCase()}`;

  const facture = await withAudit({
    entityType: "Facture",
    action: "CREATE",
    fn: () =>
      prisma.$transaction(async (tx) => {
        const f = await tx.facture.create({
          data: {
            numero: numeroBrouillon,
            patientId: parsed.patientId,
            montantHT,
            montantTTC,
            tva,
            statut: "BROUILLON",
            notes: parsed.notes ?? null
          }
        });
        await tx.seance.updateMany({
          where: { id: { in: seances.map((s) => s.id) } },
          data: { factureId: f.id }
        });
        return f;
      })
  });

  invalidateFactureCaches();
  revalidatePath("/factures");
  revalidatePath("/dashboard");
  return facture;
}

/**
 * Met à jour un brouillon de facture (tva, notes, échéance, acompte, lignes libres).
 * Recalcule automatiquement les totaux. Seul un BROUILLON est modifiable.
 */
export async function updateFactureBrouillon(id: string, input: FactureBrouillonUpdate) {
  const parsed = factureBrouillonUpdateSchema.parse(input);
  const facture = await prisma.facture.findUnique({ where: { id } });
  if (!facture) throw new Error("Facture introuvable");
  if (facture.statut !== "BROUILLON") {
    throw new Error("Seul un brouillon peut être modifié");
  }
  await withAudit({
    entityType: "Facture",
    action: "UPDATE",
    entityId: id,
    loadBefore: async () => facture,
    fn: () =>
      prisma.facture.update({
        where: { id },
        data: {
          tva: parsed.tva ?? facture.tva,
          notes: parsed.notes === undefined ? facture.notes : parsed.notes,
          dateEcheance:
            parsed.dateEcheance === undefined ? facture.dateEcheance : parsed.dateEcheance,
          acompte: parsed.acompte ?? facture.acompte,
          lignesLibres:
            parsed.lignesLibres !== undefined
              ? JSON.stringify(parsed.lignesLibres)
              : facture.lignesLibres
        }
      })
  });
  await recomputeAndPersist(id);
  invalidateFactureCaches();
  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
  return prisma.facture.findUnique({ where: { id } });
}

/**
 * Ajoute des séances HONOREE non facturées au brouillon.
 */
export async function addSeancesToBrouillon(id: string, seanceIds: string[]) {
  const facture = await prisma.facture.findUnique({ where: { id } });
  if (!facture) throw new Error("Facture introuvable");
  if (facture.statut !== "BROUILLON") throw new Error("La facture n'est plus modifiable");

  await withAudit({
    entityType: "Facture",
    action: "UPDATE",
    entityId: id,
    loadBefore: async () => facture,
    fn: () =>
      prisma.seance.updateMany({
        where: { id: { in: seanceIds }, patientId: facture.patientId, factureId: null },
        data: { factureId: id }
      })
  });
  await recomputeAndPersist(id);
  invalidateFactureCaches();
  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
}

/**
 * Retire une séance du brouillon (la libère pour une future facturation).
 */
export async function removeSeanceFromBrouillon(factureId: string, seanceId: string) {
  const facture = await prisma.facture.findUnique({ where: { id: factureId } });
  if (!facture) throw new Error("Facture introuvable");
  if (facture.statut !== "BROUILLON") throw new Error("La facture n'est plus modifiable");

  await withAudit({
    entityType: "Facture",
    action: "UPDATE",
    entityId: factureId,
    loadBefore: async () => facture,
    fn: () => prisma.seance.update({ where: { id: seanceId }, data: { factureId: null } })
  });
  await recomputeAndPersist(factureId);
  revalidatePath("/factures");
  revalidatePath(`/factures/${factureId}`);
}

/**
 * Émet une facture brouillon : passe en EMISE et fige un numéro stable au format YYYY-NNNN.
 * La lecture du dernier numéro + l'update sont en transaction pour éviter les doublons
 * lors d'appels parallèles (contrainte @unique sur `numero` éviterait le doublon mais
 * crasherait l'utilisateur — la transaction sérialise proprement).
 */
export async function emettreFacture(id: string) {
  const facture = await prisma.facture.findUnique({ where: { id } });
  if (!facture) throw new Error("Facture introuvable");
  if (facture.statut !== "BROUILLON") throw new Error("La facture n'est pas un brouillon");

  const config = await prisma.config.findUnique({ where: { id: "default" } });
  const prefixe = config?.prefixeFacture ?? "F";
  const year = new Date().getFullYear();

  const updated = await withAudit({
    entityType: "Facture",
    action: "UPDATE",
    entityId: id,
    loadBefore: async () => facture,
    fn: () =>
      prisma.$transaction(async (tx) => {
        const lastEmise = await tx.facture.findFirst({
          where: {
            statut: { not: "BROUILLON" },
            numero: { startsWith: `${prefixe}${year}-` }
          },
          orderBy: { numero: "desc" }
        });
        const lastN = lastEmise ? Number(lastEmise.numero.split("-").pop()) || 0 : 0;
        const numero = `${prefixe}${year}-${String(lastN + 1).padStart(4, "0")}`;
        return tx.facture.update({
          where: { id },
          data: { statut: "EMISE", numero, dateEmission: new Date() }
        });
      })
  });

  invalidateFactureCaches();
  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
  return updated;
}

export async function marquerPayee(id: string, modePaiement?: string) {
  const updated = await withAudit({
    entityType: "Facture",
    action: "UPDATE",
    entityId: id,
    loadBefore: () => prisma.facture.findUnique({ where: { id } }),
    fn: () =>
      prisma.facture.update({
        where: { id },
        data: { statut: "PAYEE", datePaiement: new Date(), modePaiement: modePaiement ?? null }
      })
  });
  invalidateFactureCaches();
  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
  revalidatePath("/dashboard");
  return updated;
}

export async function annulerFacture(id: string) {
  const before = await prisma.facture.findUnique({ where: { id } });
  await withAudit({
    entityType: "Facture",
    action: "UPDATE",
    entityId: id,
    loadBefore: async () => before,
    fn: async () => {
      const result = await prisma.$transaction([
        prisma.seance.updateMany({ where: { factureId: id }, data: { factureId: null } }),
        prisma.facture.update({ where: { id }, data: { statut: "ANNULEE" } })
      ]);
      return result[1];
    }
  });
  invalidateFactureCaches();
  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
}

export async function deleteFactureBrouillon(id: string) {
  const f = await prisma.facture.findUnique({ where: { id } });
  if (!f) throw new Error("Facture introuvable");
  if (f.statut !== "BROUILLON") throw new Error("Seuls les brouillons peuvent être supprimés");

  await withAudit({
    entityType: "Facture",
    action: "DELETE",
    entityId: id,
    loadBefore: async () => f,
    fn: async () => {
      const result = await prisma.$transaction([
        prisma.seance.updateMany({ where: { factureId: id }, data: { factureId: null } }),
        prisma.facture.delete({ where: { id } })
      ]);
      return result[1];
    }
  });
  revalidatePath("/factures");
}
