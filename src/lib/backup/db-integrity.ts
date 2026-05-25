/**
 * Vérification d'intégrité de la base SQLite via `PRAGMA integrity_check`.
 *
 * Différent de `integrity.ts` (qui vérifie les fichiers de sauvegarde via SHA-256).
 * Ici on demande à SQLite lui-même de scanner ses pages et de détecter une
 * corruption interne (pages déchirées, btree cassé, etc.).
 *
 * Appelé :
 *  - au boot du serveur (best-effort, log si KO)
 *  - manuellement depuis Paramètres (server action)
 */

import { prisma } from "@/lib/db";

export type IntegrityStatus = "ok" | "corrupt" | "error";

export type DbIntegrityResult = {
  status: IntegrityStatus;
  /** Messages bruts retournés par SQLite. `["ok"]` si tout va bien. */
  details: string[];
  /** Temps d'exécution du check en ms. */
  durationMs: number;
  /** Date du check. */
  checkedAt: string;
};

type IntegrityRow = { integrity_check?: string };

/**
 * Lance `PRAGMA integrity_check` (rapide : quelques ms pour < 100k lignes).
 * Pour une vérification plus poussée (mais bien plus lente), utiliser
 * `PRAGMA integrity_check(N)` ou `PRAGMA quick_check`. On reste sur le défaut.
 */
export async function checkDatabaseIntegrity(): Promise<DbIntegrityResult> {
  const start = Date.now();
  try {
    const rows = await prisma.$queryRawUnsafe<IntegrityRow[]>("PRAGMA integrity_check");
    const details = rows
      .map((r) => r.integrity_check)
      .filter((v): v is string => typeof v === "string");
    const ok = details.length === 1 && details[0] === "ok";
    return {
      status: ok ? "ok" : "corrupt",
      details,
      durationMs: Date.now() - start,
      checkedAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      status: "error",
      details: [err instanceof Error ? err.message : "Erreur inconnue"],
      durationMs: Date.now() - start,
      checkedAt: new Date().toISOString()
    };
  }
}

// État partagé entre import du module et serveur — évite de relancer le check
// à chaque hot-reload en dev.
const globalKey = "__psychhub_db_integrity__";
type GlobalWithIntegrity = typeof globalThis & {
  [globalKey]?: {
    checked: boolean;
    lastResult: DbIntegrityResult | null;
  };
};

function state() {
  const g = globalThis as GlobalWithIntegrity;
  if (!g[globalKey]) g[globalKey] = { checked: false, lastResult: null };
  return g[globalKey]!;
}

/**
 * Lance le check une seule fois par cycle de vie du process serveur.
 * - Si OK : log discret en dev uniquement.
 * - Si corrompu/erreur : log d'erreur **toujours** (prod compris) — c'est un incident.
 * - Idempotent : ré-appels retournent le résultat mémorisé.
 *
 * Retourne le résultat pour permettre une action côté caller (alerte, etc.).
 */
export async function runStartupIntegrityCheck(): Promise<DbIntegrityResult | null> {
  if (typeof window !== "undefined") return null;
  const s = state();
  if (s.checked) return s.lastResult;
  s.checked = true;

  const result = await checkDatabaseIntegrity();
  s.lastResult = result;

  if (result.status === "ok") {
    if (process.env.NODE_ENV === "development") {
      console.log(`[db-integrity] OK (${result.durationMs}ms)`);
    }
  } else {
    // Toujours visible — incident potentiel sur des données patient
    console.error(
      `[db-integrity] ${result.status.toUpperCase()} — ${result.details.join(" | ")}`
    );
  }
  return result;
}

export function getLastIntegrityResult(): DbIntegrityResult | null {
  return state().lastResult;
}
