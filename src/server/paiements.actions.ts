"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { withAudit } from "@/server/with-audit";
import { TAGS_ON_FACTURE_CHANGE } from "@/server/cache-tags";

export interface PaiementInput {
  factureId: string;
  date?: Date;
  montant: number;
  mode?: string | null;
  reference?: string | null;
}

export interface PaiementRow {
  id: string;
  date: string;
  montant: number;
  mode: string | null;
  reference: string | null;
}

const VALID_MODES = new Set(["VIREMENT", "CB", "CHEQUE", "ESPECES", "AUTRE"]);

function invalidateFactureCaches() {
  for (const tag of TAGS_ON_FACTURE_CHANGE) revalidateTag(tag);
}

/**
 * Recalcule le statut d'une facture en fonction du solde dû.
 * - solde > 0 et date d'échéance dépassée → EN_RETARD
 * - solde > 0 et pas dépassée → garde EMISE (ou EN_RETARD si déjà passé)
 * - solde <= 0 → PAYEE + datePaiement = date du dernier paiement
 *
 * Ne touche pas BROUILLON / ANNULEE.
 */
async function recomputeStatut(factureId: string): Promise<void> {
  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { paiements: true }
  });
  if (!facture) return;
  if (facture.statut === "BROUILLON" || facture.statut === "ANNULEE") return;

  const totalPaye =
    (facture as { acompte?: number }).acompte ??
    0 +
      facture.paiements.reduce((acc, p) => acc + p.montant, 0);
  // l'opérateur ?? a une précédence faible, on recompose proprement :
  const acompte = (facture as { acompte?: number }).acompte ?? 0;
  const sommePaiements = facture.paiements.reduce((acc, p) => acc + p.montant, 0);
  const totalRegle = acompte + sommePaiements;
  const solde = facture.montantTTC - totalRegle;

  let nextStatut = facture.statut;
  let datePaiement = facture.datePaiement;

  if (solde <= 0.001) {
    nextStatut = "PAYEE";
    const lastPay = [...facture.paiements].sort((a, b) => b.date.getTime() - a.date.getTime())[0];
    datePaiement = lastPay?.date ?? facture.datePaiement ?? new Date();
  } else {
    const echeance = facture.dateEcheance;
    if (echeance && echeance < new Date()) {
      nextStatut = "EN_RETARD";
    } else if (facture.statut === "PAYEE") {
      // Le total a baissé sous le payé (cas rare : suppression d'un paiement) → revient à EMISE
      nextStatut = "EMISE";
      datePaiement = null;
    }
  }

  if (nextStatut !== facture.statut || datePaiement !== facture.datePaiement) {
    await prisma.facture.update({
      where: { id: factureId },
      data: { statut: nextStatut, datePaiement }
    });
  }
  // Le statut suppress unused warning
  void totalPaye;
}

export async function listPaiements(factureId: string): Promise<PaiementRow[]> {
  const rows = await prisma.paiement.findMany({
    where: { factureId },
    orderBy: { date: "desc" }
  });
  return rows.map((p) => ({
    id: p.id,
    date: p.date.toISOString(),
    montant: p.montant,
    mode: p.mode,
    reference: p.reference
  }));
}

export async function addPaiement(input: PaiementInput): Promise<PaiementRow> {
  if (!Number.isFinite(input.montant) || input.montant <= 0) {
    throw new Error("Montant invalide (doit être > 0)");
  }
  if (input.mode && !VALID_MODES.has(input.mode)) {
    throw new Error(`Mode de paiement inconnu : ${input.mode}`);
  }
  const facture = await prisma.facture.findUnique({ where: { id: input.factureId } });
  if (!facture) throw new Error("Facture introuvable");
  if (facture.statut === "BROUILLON") {
    throw new Error("Pas de paiement possible sur un brouillon — émettez la facture d'abord");
  }
  if (facture.statut === "ANNULEE") {
    throw new Error("Pas de paiement possible sur une facture annulée");
  }

  const created = await withAudit({
    entityType: "Facture",
    action: "UPDATE",
    entityId: facture.id,
    loadBefore: async () => facture,
    fn: () =>
      prisma.paiement.create({
        data: {
          factureId: input.factureId,
          montant: input.montant,
          mode: input.mode ?? null,
          reference: input.reference ?? null,
          date: input.date ?? new Date()
        }
      })
  });

  await recomputeStatut(input.factureId);
  invalidateFactureCaches();
  revalidatePath(`/factures/${input.factureId}`);
  revalidatePath("/factures");
  revalidatePath("/dashboard");

  return {
    id: created.id,
    date: created.date.toISOString(),
    montant: created.montant,
    mode: created.mode,
    reference: created.reference
  };
}

export async function removePaiement(id: string): Promise<void> {
  const paiement = await prisma.paiement.findUnique({ where: { id } });
  if (!paiement) throw new Error("Paiement introuvable");

  await withAudit({
    entityType: "Facture",
    action: "UPDATE",
    entityId: paiement.factureId,
    loadBefore: async () => paiement,
    fn: () => prisma.paiement.delete({ where: { id } })
  });

  await recomputeStatut(paiement.factureId);
  invalidateFactureCaches();
  revalidatePath(`/factures/${paiement.factureId}`);
  revalidatePath("/factures");
}

/**
 * Renvoie le récapitulatif financier d'une facture (utile pour l'UI).
 */
export async function getFactureSolde(factureId: string): Promise<{
  montantTTC: number;
  acompte: number;
  totalPaiements: number;
  totalRegle: number;
  soldeDu: number;
}> {
  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { paiements: true }
  });
  if (!facture) throw new Error("Facture introuvable");
  const acompte = (facture as { acompte?: number }).acompte ?? 0;
  const totalPaiements = facture.paiements.reduce((acc, p) => acc + p.montant, 0);
  const totalRegle = acompte + totalPaiements;
  return {
    montantTTC: facture.montantTTC,
    acompte,
    totalPaiements,
    totalRegle,
    soldeDu: Math.max(0, facture.montantTTC - totalRegle)
  };
}
