/**
 * Pipeline de transformation/normalisation des valeurs d'import.
 * Chaque transformer est pur et chaînable.
 *
 * Usage :
 *   const pipeline = compose("trim", "normalizePhone");
 *   pipeline("06.12.34.56.78") // => "+33612345678"
 */

import { parsePhoneNumberFromString } from "libphonenumber-js";

export type TransformerFn = (value: unknown) => unknown;

export const TRANSFORMERS = {
  /** Convertit en string et trim. null/undefined → "" (compat suite pipeline). */
  trim: (v: unknown): string => String(v ?? "").trim(),

  /** Normalise un numéro de téléphone FR au format E.164. Retourne la valeur initiale si invalide. */
  normalizePhone: (v: unknown): string => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    const parsed = parsePhoneNumberFromString(s, "FR");
    return parsed?.isValid() ? parsed.number : s;
  },

  /** Email en minuscules, trim. */
  normalizeEmail: (v: unknown): string => String(v ?? "").trim().toLowerCase(),

  /** Parse date FR (dd/mm/yyyy) ou ISO. Retourne ISO ou "" si invalide. */
  parseFrenchDate: (v: unknown): string => {
    if (!v) return "";
    if (v instanceof Date) {
      return Number.isNaN(v.getTime()) ? "" : v.toISOString();
    }
    const s = String(v).trim();
    if (!s) return "";

    const fr = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (fr) {
      const year = Number(fr[3].length === 2 ? `20${fr[3]}` : fr[3]);
      const d = new Date(
        year,
        Number(fr[2]) - 1,
        Number(fr[1]),
        Number(fr[4] ?? 0),
        Number(fr[5] ?? 0),
        Number(fr[6] ?? 0)
      );
      return Number.isNaN(d.getTime()) ? "" : d.toISOString();
    }
    const iso = new Date(s);
    return Number.isNaN(iso.getTime()) ? "" : iso.toISOString();
  },

  /** Title Case naïf pour noms/prénoms (ex: "DURAND" → "Durand"). Gère les apostrophes/tirets. */
  titleCase: (v: unknown): string => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    return s.toLowerCase().replace(/(^|[\s\-'])([\p{L}])/gu, (_, sep, ch) => sep + ch.toUpperCase());
  },

  /** Convertit "60,50" en nombre 60.5. Retourne null si non-numérique. */
  numericFromFrLocale: (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  },

  /** Convertit en booléen tolérant ("oui", "1", "true" → true). */
  parseBool: (v: unknown): boolean => {
    if (typeof v === "boolean") return v;
    const s = String(v ?? "").trim().toLowerCase();
    return s === "true" || s === "1" || s === "oui" || s === "yes" || s === "vrai";
  },

  /** Remplace les chaînes vides par null (utile pour passage en BD). */
  emptyToNull: (v: unknown): unknown => {
    if (typeof v === "string" && v.trim() === "") return null;
    return v;
  }
} satisfies Record<string, TransformerFn>;

export type TransformerName = keyof typeof TRANSFORMERS;

/**
 * Compose plusieurs transformers en pipeline appliqué de gauche à droite.
 */
export function compose(...names: TransformerName[]): TransformerFn {
  return (v: unknown) => {
    let cur: unknown = v;
    for (const n of names) {
      cur = TRANSFORMERS[n](cur);
    }
    return cur;
  };
}

/**
 * Applique un pipeline distinct à chaque champ d'un row.
 */
export function applyFieldPipelines(
  row: Record<string, unknown>,
  pipelines: Record<string, TransformerName[]>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const [field, names] of Object.entries(pipelines)) {
    if (field in out) out[field] = compose(...names)(out[field]);
  }
  return out;
}
