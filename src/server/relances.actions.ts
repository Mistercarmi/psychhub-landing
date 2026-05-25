"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildEml, renderTemplate } from "@/lib/outlook/eml-builder";
import { withAudit } from "@/server/with-audit";

const DEFAULT_DELAIS_JOURS = [15, 30, 45];
const DEFAULT_TEMPLATE =
  "Bonjour {{prenom}},\n\nVotre facture n°{{numero}} d'un montant de {{montant}} € est toujours en attente de règlement.\n\nNous vous remercions de bien vouloir procéder au paiement.\n\nCordialement,\n{{praticien}}";

export interface RelanceDraft {
  factureId: string;
  numero: string;
  patientPrenom: string;
  patientNom: string;
  patientEmail: string;
  joursEcoules: number;
  paliersAtteints: number[];
  montantTTC: number;
  /** Contenu .eml prêt à servir. */
  eml: string;
  filename: string;
}

export interface RelanceHistoryEntry {
  date: string;
  palier: number;
}

function parseHistoryInternal(raw: string | null | undefined): RelanceHistoryEntry[] {
  if (!raw) return [];
  try {
    const o = JSON.parse(raw);
    if (!Array.isArray(o)) return [];
    return o.filter(
      (e): e is RelanceHistoryEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as RelanceHistoryEntry).date === "string" &&
        typeof (e as RelanceHistoryEntry).palier === "number"
    );
  } catch {
    return [];
  }
}

function parseDelais(raw: string | null | undefined): number[] {
  if (!raw) return DEFAULT_DELAIS_JOURS;
  try {
    const o = JSON.parse(raw);
    if (Array.isArray(o) && o.every((n) => typeof n === "number" && n > 0)) {
      return o.sort((a, b) => a - b);
    }
  } catch {
    // silencieux
  }
  return DEFAULT_DELAIS_JOURS;
}

/**
 * Identifie les factures impayées dont l'échéance est dépassée et génère un brouillon
 * `.eml` pour chacune. Marque l'historique côté Facture.relancesEnvoyeesJson.
 *
 * Renvoie les drafts à présenter à l'utilisateur — pas d'envoi automatique.
 */
export async function genererBrouillonsRelance(): Promise<RelanceDraft[]> {
  const now = new Date();
  const config = await prisma.config.findUnique({ where: { id: "default" } });
  const delais = parseDelais(config?.delaisRelancesJson);
  const template =
    config?.templateMailRelance?.trim() && config.templateMailRelance.trim().length > 0
      ? config.templateMailRelance
      : DEFAULT_TEMPLATE;

  const factures = await prisma.facture.findMany({
    where: {
      statut: { in: ["EMISE", "EN_RETARD"] }
    },
    include: { patient: true }
  });

  const drafts: RelanceDraft[] = [];

  for (const f of factures) {
    if (!f.patient.email) continue;
    const echeance = f.dateEcheance ?? f.dateEmission;
    const joursEcoules = Math.floor((now.getTime() - echeance.getTime()) / 86_400_000);
    if (joursEcoules <= 0) continue;

    const history = parseHistoryInternal(f.relancesEnvoyeesJson);
    const paliersAtteints = delais.filter((d) => joursEcoules >= d);
    const paliersNonEncoreEnvoyes = paliersAtteints.filter(
      (d) => !history.some((h) => h.palier === d)
    );
    if (paliersNonEncoreEnvoyes.length === 0) continue;

    const body = renderTemplate(template, {
      prenom: f.patient.prenom,
      nom: f.patient.nom,
      numero: f.numero,
      montant: f.montantTTC.toFixed(2).replace(".", ","),
      praticien: config?.praticienNom ?? config?.cabinetNom ?? ""
    });

    const subject = `Relance — Facture ${f.numero} (${joursEcoules} jours)`;
    const eml = buildEml({
      to: f.patient.email,
      from: config?.email ?? "",
      subject,
      bodyText: body
    });

    drafts.push({
      factureId: f.id,
      numero: f.numero,
      patientPrenom: f.patient.prenom,
      patientNom: f.patient.nom,
      patientEmail: f.patient.email,
      joursEcoules,
      paliersAtteints: paliersNonEncoreEnvoyes,
      montantTTC: f.montantTTC,
      eml,
      filename: `relance-${f.numero}.eml`
    });
  }

  return drafts;
}

/**
 * Marque les paliers indiqués comme envoyés (helper bas-niveau).
 * À appeler depuis une server action wrapée par `withAudit`, pas directement depuis l'UI.
 */
export async function marquerRelanceEnvoyee(factureId: string, paliers: number[]): Promise<void> {
  const facture = await prisma.facture.findUnique({ where: { id: factureId } });
  if (!facture) throw new Error("Facture introuvable");
  const current = parseHistoryInternal(facture.relancesEnvoyeesJson);
  const next: RelanceHistoryEntry[] = [
    ...current,
    ...paliers.map((p) => ({ date: new Date().toISOString(), palier: p }))
  ];
  await prisma.facture.update({
    where: { id: factureId },
    data: { relancesEnvoyeesJson: JSON.stringify(next) }
  });
}

const marquerSchema = z.object({ factureId: z.string().cuid() });

/**
 * Wrapper UI : à appeler après que l'utilisateur a téléchargé le brouillon .eml
 * et confirmé l'envoi. Calcule lui-même les paliers à marquer (échéance + délais
 * config) et écrit l'historique. No-op si tout est déjà marqué (idempotent).
 *
 * Retourne la liste des paliers marqués cette fois-ci (vide si idempotence).
 */
export async function marquerRelanceEnvoyeeUI(factureId: string): Promise<number[]> {
  const parsed = marquerSchema.safeParse({ factureId });
  if (!parsed.success) throw new Error("Identifiant facture invalide");

  const [facture, config] = await Promise.all([
    prisma.facture.findUnique({ where: { id: parsed.data.factureId } }),
    prisma.config.findUnique({ where: { id: "default" } })
  ]);
  if (!facture) throw new Error("Facture introuvable");

  const delais = parseDelais(config?.delaisRelancesJson);
  const echeance = facture.dateEcheance ?? facture.dateEmission;
  const joursEcoules = Math.floor((Date.now() - echeance.getTime()) / 86_400_000);
  const paliersAtteints = delais.filter((d) => joursEcoules >= d);

  const history = parseHistoryInternal(facture.relancesEnvoyeesJson);
  const aMarquer = paliersAtteints.filter(
    (p) => !history.some((h) => h.palier === p)
  );

  if (aMarquer.length === 0) return [];

  await withAudit({
    entityType: "Facture",
    action: "UPDATE",
    entityId: facture.id,
    loadBefore: async () => ({ relancesEnvoyeesJson: facture.relancesEnvoyeesJson }),
    fn: async () => {
      await marquerRelanceEnvoyee(facture.id, aMarquer);
      return { id: facture.id, paliers: aMarquer };
    }
  });

  revalidatePath("/factures");
  revalidatePath(`/factures/${facture.id}`);
  return aMarquer;
}

/**
 * Retourne l'historique parsé des relances pour une facture donnée.
 * Sans effet de bord — sûr à appeler depuis un Server Component.
 */
export async function getRelancesHistory(factureId: string): Promise<RelanceHistoryEntry[]> {
  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    select: { relancesEnvoyeesJson: true }
  });
  return parseHistoryInternal(facture?.relancesEnvoyeesJson);
}
