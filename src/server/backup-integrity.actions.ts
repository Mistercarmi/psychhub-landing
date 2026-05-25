"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verifyBackupIntegrity, type IntegrityCheckResult } from "@/lib/backup/integrity";
import {
  checkDatabaseIntegrity,
  getLastIntegrityResult,
  type DbIntegrityResult
} from "@/lib/backup/db-integrity";

export interface BackupIntegrityReport extends IntegrityCheckResult {
  backupLogId: string;
}

/**
 * Vérifie l'intégrité d'un BackupLog donné et persiste le résultat (`signatureValid`).
 * À appeler depuis l'UI (bouton "Vérifier") ou en tâche planifiée.
 */
export async function checkBackupIntegrity(backupLogId: string): Promise<BackupIntegrityReport> {
  const log = await prisma.backupLog.findUnique({ where: { id: backupLogId } });
  if (!log) throw new Error("Backup introuvable");

  const result = await verifyBackupIntegrity(
    log.filePath ?? null,
    (log as unknown as { hash?: string | null }).hash ?? null
  );

  await prisma.backupLog.update({
    where: { id: backupLogId },
    data: { signatureValid: result.valid } as never
  });

  revalidatePath("/sauvegardes");
  return { ...result, backupLogId };
}

/**
 * Vérifie l'intégrité de la base SQLite elle-même via `PRAGMA integrity_check`.
 * Appelable depuis Paramètres → "Vérifier la base maintenant".
 */
export async function runDatabaseIntegrityCheck(): Promise<DbIntegrityResult> {
  return checkDatabaseIntegrity();
}

/**
 * Retourne le dernier résultat de check effectué au boot, sans relancer la requête.
 * Utile pour afficher un badge "BD : OK" / "BD : corrompue" dans la sidebar.
 */
export async function readLastDatabaseIntegrity(): Promise<DbIntegrityResult | null> {
  return getLastIntegrityResult();
}

/**
 * Lance la vérification d'intégrité sur les N backups les plus récents (utile en batch).
 */
export async function checkRecentBackupsIntegrity(limit = 10): Promise<BackupIntegrityReport[]> {
  const recent = await prisma.backupLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit
  });
  const reports: BackupIntegrityReport[] = [];
  for (const r of recent) {
    try {
      const res = await checkBackupIntegrity(r.id);
      reports.push(res);
    } catch (err) {
      reports.push({
        backupLogId: r.id,
        valid: false,
        currentHash: null,
        expectedHash: null,
        sizeBytes: null,
        reason: err instanceof Error ? err.message : "Erreur"
      });
    }
  }
  return reports;
}
