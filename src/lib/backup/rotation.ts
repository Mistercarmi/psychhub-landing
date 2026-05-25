/**
 * Rotation/rétention des sauvegardes locales.
 *
 * Règles :
 *  - Conserve toujours au moins `minKeep` fichiers les plus récents (filet anti-perte totale).
 *  - Au-delà, supprime les fichiers plus vieux que `retentionDays` jours.
 *  - Si `retentionDays <= 0`, ne supprime rien (rétention infinie).
 *  - Ne touche qu'aux fichiers reconnus par les patterns connus (psychhub-backup-*, psychhub-snapshot-*).
 *  - Best-effort : toute erreur de suppression est loggée mais n'interrompt pas la boucle.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { backupDir, BACKUP_FILENAME_PATTERN, HUMAN_SNAPSHOT_FILENAME_PATTERN } from "@/lib/backup/local-backup";

const KNOWN_PATTERNS = [BACKUP_FILENAME_PATTERN, HUMAN_SNAPSHOT_FILENAME_PATTERN];

function isKnownBackupName(name: string): boolean {
  return KNOWN_PATTERNS.some((re) => re.test(name));
}

export type RotationResult = {
  scanned: number;
  deleted: string[];
  kept: number;
  errors: { file: string; error: string }[];
  /** Octets libérés (somme des tailles des fichiers supprimés). */
  freedBytes: number;
};

export type RotationOptions = {
  /** Jours de rétention. <=0 => rétention infinie, aucune suppression. */
  retentionDays: number;
  /** Nombre minimum de fichiers à conserver, indépendamment de l'âge. */
  minKeep: number;
  /** Répertoire à nettoyer. Par défaut : `Sauvegarde/` à la racine du projet. */
  dir?: string;
  /** Mode dry-run : liste ce qui serait supprimé sans toucher au disque. */
  dryRun?: boolean;
  /** Date "maintenant" — injectable pour les tests. */
  now?: Date;
};

type Entry = {
  name: string;
  fullPath: string;
  mtimeMs: number;
  size: number;
};

export async function pruneLocalBackups(opts: RotationOptions): Promise<RotationResult> {
  const dir = opts.dir ?? backupDir();
  const now = (opts.now ?? new Date()).getTime();
  const result: RotationResult = { scanned: 0, deleted: [], kept: 0, errors: [], freedBytes: 0 };

  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch (err) {
    // ENOENT : dossier absent → rien à faire, c'est attendu au premier run.
    // Toute autre erreur (EACCES, EBUSY, EIO…) doit remonter pour que l'opérateur
    // puisse voir que la rotation n'a pas pu scanner.
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      result.errors.push({
        file: dir,
        error: err instanceof Error ? `readdir failed: ${err.message}` : "readdir failed"
      });
    }
    return result;
  }

  const entries: Entry[] = [];
  for (const name of names) {
    if (!isKnownBackupName(name)) continue;
    const fullPath = path.join(dir, name);
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) continue;
      entries.push({ name, fullPath, mtimeMs: stat.mtimeMs, size: stat.size });
    } catch (err) {
      result.errors.push({ file: name, error: err instanceof Error ? err.message : "stat failed" });
    }
  }
  result.scanned = entries.length;

  // Tri du plus récent au plus ancien
  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const minKeep = Math.max(0, opts.minKeep);

  // Rétention infinie : on garde tout
  if (opts.retentionDays <= 0) {
    result.kept = entries.length;
    return result;
  }

  const cutoff = now - opts.retentionDays * 86_400_000;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    // Toujours conserver les `minKeep` plus récents
    if (i < minKeep) {
      result.kept++;
      continue;
    }
    if (e.mtimeMs >= cutoff) {
      result.kept++;
      continue;
    }
    // Candidat à la suppression
    if (opts.dryRun) {
      result.deleted.push(e.name);
      result.freedBytes += e.size;
      continue;
    }
    try {
      await fs.unlink(e.fullPath);
      result.deleted.push(e.name);
      result.freedBytes += e.size;
    } catch (err) {
      result.errors.push({ file: e.name, error: err instanceof Error ? err.message : "unlink failed" });
    }
  }

  return result;
}
