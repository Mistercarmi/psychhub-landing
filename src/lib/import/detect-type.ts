/**
 * Détection automatique du type de données d'un fichier importé.
 * Analyse les en-têtes (insensible aux accents/casse) et choisit entre :
 * - "doctolib"  : export Doctolib brut (séances)
 * - "patients"  : liste de patients
 * - "seances"   : séances déjà structurées (id, patientId)
 * - "factures"  : factures
 * - "unknown"   : pas de signature reconnue
 */

export type EntityType = "doctolib" | "patients" | "seances" | "factures" | "unknown";

export type SheetSummary = {
  name: string;
  headers: string[];
  sampleRows: Record<string, unknown>[];
  detectedType: EntityType;
  confidence: number; // 0..1
  suggestedMapping: Record<string, string>; // header source → champ cible
};

export type DetectionResult = {
  perSheet: SheetSummary[];
  bestType: EntityType;
  bestConfidence: number;
};

function normalize(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SIGNATURES: { type: Exclude<EntityType, "unknown">; required: string[]; bonus: string[] }[] = [
  {
    type: "doctolib",
    required: ["nom", "prenom"],
    bonus: ["doctolibref", "rendez vous", "rdv", "ref doctolib", "praticien"]
  },
  {
    type: "factures",
    required: ["numero"],
    bonus: ["montantttc", "montantht", "date emission", "tva", "facture"]
  },
  {
    type: "seances",
    required: ["date"],
    bonus: ["dureeminutes", "duree min", "patientid", "id patient", "seance", "statut"]
  },
  {
    type: "patients",
    required: ["nom", "prenom"],
    bonus: ["email", "telephone", "adresse", "datenaissance", "date naissance", "patient"]
  }
];

function score(headers: string[], required: string[], bonus: string[]): number {
  const tokens = headers.map(normalize).map((h) => h.replace(/\s+/g, ""));
  const hasAll = required.every((r) => tokens.some((t) => t.includes(r.replace(/\s+/g, ""))));
  if (!hasAll) return 0;
  const bonusHit = bonus.filter((b) => tokens.some((t) => t.includes(b.replace(/\s+/g, "")))).length;
  // 0.55 si juste les required, jusqu'à 0.95 si tous les bonus
  return Math.min(0.55 + 0.1 * bonusHit, 0.95);
}

export function detectSheetType(headers: string[], sheetName?: string): { type: EntityType; confidence: number } {
  // Indice par nom de feuille
  const sn = normalize(sheetName);
  let prior: { type: EntityType; boost: number } | null = null;
  if (sn.includes("patient")) prior = { type: "patients", boost: 0.1 };
  else if (sn.includes("facture")) prior = { type: "factures", boost: 0.1 };
  else if (sn.includes("seance") || sn.includes("rdv") || sn.includes("rendez")) prior = { type: "seances", boost: 0.1 };
  else if (sn.includes("doctolib")) prior = { type: "doctolib", boost: 0.15 };

  let best: { type: EntityType; confidence: number } = { type: "unknown", confidence: 0 };
  for (const sig of SIGNATURES) {
    let s = score(headers, sig.required, sig.bonus);
    if (s === 0) continue;
    if (prior && prior.type === sig.type) s = Math.min(1, s + prior.boost);
    if (s > best.confidence) best = { type: sig.type, confidence: s };
  }
  return best;
}

import { TARGET_FIELDS, suggestMapping } from "./column-mapper";

export function summarizeSheet(
  name: string,
  headers: string[],
  rows: Record<string, unknown>[]
): SheetSummary {
  const { type, confidence } = detectSheetType(headers, name);
  const mappingTarget =
    type === "doctolib" || type === "seances"
      ? "seances"
      : type === "patients"
        ? "patients"
        : type === "factures"
          ? "factures"
          : "patients";
  const suggestedMapping = suggestMapping(headers, mappingTarget);
  // Ne renvoie que les fields cibles connus dans la suggestion
  const known = new Set<string>(TARGET_FIELDS[mappingTarget]);
  const cleaned: Record<string, string> = {};
  for (const [h, k] of Object.entries(suggestedMapping)) {
    if (known.has(k)) cleaned[h] = k;
  }
  return {
    name,
    headers,
    sampleRows: rows.slice(0, 5),
    detectedType: type,
    confidence,
    suggestedMapping: cleaned
  };
}

export function pickBestType(summaries: SheetSummary[]): { type: EntityType; confidence: number } {
  let best: { type: EntityType; confidence: number } = { type: "unknown", confidence: 0 };
  for (const s of summaries) {
    if (s.confidence > best.confidence) best = { type: s.detectedType, confidence: s.confidence };
  }
  return best;
}
