import { z } from "zod";

export const ligneLibreSchema = z.object({
  description: z.string().min(1, "Description requise"),
  montant: z.coerce.number(),
  quantite: z.coerce.number().int().positive().default(1)
});
export type LigneLibre = z.infer<typeof ligneLibreSchema>;

export const factureBrouillonUpdateSchema = z.object({
  tva: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().nullable().optional(),
  dateEcheance: z.coerce.date().nullable().optional(),
  acompte: z.coerce.number().min(0).optional(),
  /** Liste complète des lignes libres ; remplace l'existant. */
  lignesLibres: z.array(ligneLibreSchema).optional()
});
export type FactureBrouillonUpdate = z.infer<typeof factureBrouillonUpdateSchema>;

export const factureBrouillonCreateSchema = z.object({
  patientId: z.string().cuid("Identifiant patient invalide"),
  seanceIds: z.array(z.string().cuid()).min(1, "Au moins une séance requise"),
  tva: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().nullable().optional()
});
export type FactureBrouillonCreate = z.infer<typeof factureBrouillonCreateSchema>;

/**
 * Calcule HT/TVA/TTC à partir des séances et des lignes libres.
 * Pur, exporté pour réutilisation côté UI (recalcul live).
 */
export interface ComputeTotalsInput {
  seances: Array<{ tarif: number }>;
  lignesLibres?: LigneLibre[];
  tva?: number;
  acompte?: number;
}

export interface ComputedTotals {
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  acompte: number;
  soldeDu: number;
}

export function computeFactureTotals(input: ComputeTotalsInput): ComputedTotals {
  const seancesHT = input.seances.reduce((acc, s) => acc + (Number.isFinite(s.tarif) ? s.tarif : 0), 0);
  const lignesHT = (input.lignesLibres ?? []).reduce(
    (acc, l) => acc + (Number.isFinite(l.montant) ? l.montant * (l.quantite ?? 1) : 0),
    0
  );
  const montantHT = round2(seancesHT + lignesHT);
  const tva = input.tva ?? 0;
  const montantTVA = round2(montantHT * (tva / 100));
  const montantTTC = round2(montantHT + montantTVA);
  const acompte = round2(input.acompte ?? 0);
  const soldeDu = round2(Math.max(0, montantTTC - acompte));
  return { montantHT, montantTVA, montantTTC, acompte, soldeDu };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
