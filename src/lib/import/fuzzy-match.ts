/**
 * Dédoublonnage fuzzy de patients.
 * Score 0..100. Seuils :
 *   - ≥ 85 : match certain
 *   - 60..85 : à valider par l'utilisateur
 *   - < 60 : pas de match
 */

export type PatientCandidate = {
  nom: string;
  prenom: string;
  email?: string | null;
  dateNaissance?: Date | string | null;
};

export type ExistingPatient = {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  dateNaissance: Date | null;
};

export type MatchResult = {
  patientId: string;
  score: number;
  reasons: string[];
  snapshot: { nom: string; prenom: string; email: string | null };
};

export function normalizeName(s: string | null | undefined): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, "");
}

export function normalizeEmail(s: string | null | undefined): string {
  return String(s ?? "").trim().toLowerCase();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  const max = Math.max(a.length, b.length);
  return Math.max(0, 1 - dist / max);
}

function sameDay(a: Date | null | undefined, b: Date | string | null | undefined): boolean {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function scorePatientMatch(
  candidate: PatientCandidate,
  existing: ExistingPatient
): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  // Nom + prénom (poids 40)
  const cName = normalizeName(candidate.nom) + normalizeName(candidate.prenom);
  const eName = normalizeName(existing.nom) + normalizeName(existing.prenom);
  const nameSim = nameSimilarity(cName, eName);
  if (nameSim >= 0.95) {
    score += 40;
    reasons.push("Nom et prénom identiques");
  } else if (nameSim >= 0.85) {
    score += 30;
    reasons.push(`Nom proche (${Math.round(nameSim * 100)}%)`);
  } else if (nameSim >= 0.7) {
    score += 15;
    reasons.push(`Nom approchant (${Math.round(nameSim * 100)}%)`);
  }

  // Email exact normalisé (poids 35)
  const cEmail = normalizeEmail(candidate.email);
  const eEmail = normalizeEmail(existing.email);
  if (cEmail && eEmail && cEmail === eEmail) {
    score += 35;
    reasons.push("Email identique");
  }

  // Date de naissance exacte (poids 25)
  if (candidate.dateNaissance && existing.dateNaissance && sameDay(existing.dateNaissance, candidate.dateNaissance)) {
    score += 25;
    reasons.push("Date de naissance identique");
  }

  return {
    patientId: existing.id,
    score,
    reasons,
    snapshot: { nom: existing.nom, prenom: existing.prenom, email: existing.email }
  };
}

export function findMatches(
  candidate: PatientCandidate,
  existing: ExistingPatient[],
  options?: { minScore?: number; max?: number }
): MatchResult[] {
  const min = options?.minScore ?? 60;
  const max = options?.max ?? 5;
  return existing
    .map((e) => scorePatientMatch(candidate, e))
    .filter((m) => m.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

export const DEDUP_THRESHOLDS = {
  CERTAIN: 85,
  REVIEW: 60
} as const;
