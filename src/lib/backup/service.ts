/**
 * Service unifié des sauvegardes : exécution multi-destination + santé.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { writeHumanReadableSnapshot, backupDir, listBackups, BACKUP_FILENAME_PATTERN } from "@/lib/backup/local-backup";
import { pruneLocalBackups } from "@/lib/backup/rotation";
import { exportAllToSheet } from "@/lib/google/sheets-sync";

export type BackupDestination = "local" | "drive" | "external";

export type RunBackupOptions = {
  destinations: BackupDestination[];
  triggeredBy?: "manual" | "scheduled";
};

export type RunBackupResult = {
  results: {
    destination: BackupDestination;
    status: "OK" | "FAILED" | "SKIPPED";
    backupLogId?: string;
    filePath?: string;
    externalUrl?: string;
    sizeBytes?: number;
    error?: string;
  }[];
};

async function logBackup(opts: {
  type: "LOCAL_BACKUP" | "GSHEETS_SYNC" | "FULL_SNAPSHOT" | "EXTERNAL_FOLDER";
  format: string;
  destination: string;
  filePath?: string;
  externalUrl?: string;
  sizeBytes?: number;
  counts: Record<string, number>;
  status: "OK" | "FAILED";
  errorMessage?: string;
  triggeredBy: "manual" | "scheduled";
}) {
  return prisma.backupLog.create({
    data: {
      type: opts.type,
      format: opts.format,
      destination: opts.destination,
      filePath: opts.filePath ?? null,
      externalUrl: opts.externalUrl ?? null,
      sizeBytes: opts.sizeBytes ?? null,
      counts: JSON.stringify(opts.counts),
      status: opts.status,
      errorMessage: opts.errorMessage ?? null,
      triggeredBy: opts.triggeredBy
    }
  });
}

export async function runBackup(options: RunBackupOptions): Promise<RunBackupResult> {
  const triggeredBy = options.triggeredBy ?? "manual";
  const results: RunBackupResult["results"] = [];

  for (const dest of options.destinations) {
    try {
      if (dest === "local") {
        const res = await writeHumanReadableSnapshot();
        const log = await logBackup({
          type: "FULL_SNAPSHOT",
          format: "xlsx",
          destination: "local_folder",
          filePath: res.filePath,
          sizeBytes: res.sizeBytes,
          counts: res.counts,
          status: "OK",
          triggeredBy
        });
        results.push({ destination: "local", status: "OK", backupLogId: log.id, filePath: res.filePath, sizeBytes: res.sizeBytes });
      } else if (dest === "external") {
        const config = await prisma.config.findUnique({ where: { id: "default" } });
        const folder = config?.externalBackupFolder;
        if (!folder) {
          results.push({ destination: "external", status: "SKIPPED", error: "Aucun dossier externe configuré" });
          continue;
        }
        await fs.mkdir(folder, { recursive: true });
        const res = await writeHumanReadableSnapshot(folder);
        const log = await logBackup({
          type: "EXTERNAL_FOLDER",
          format: "xlsx",
          destination: folder,
          filePath: res.filePath,
          sizeBytes: res.sizeBytes,
          counts: res.counts,
          status: "OK",
          triggeredBy
        });
        results.push({ destination: "external", status: "OK", backupLogId: log.id, filePath: res.filePath, sizeBytes: res.sizeBytes });
      } else if (dest === "drive") {
        const config = await prisma.config.findUnique({ where: { id: "default" } });
        if (!config?.googleRefreshToken) {
          results.push({ destination: "drive", status: "SKIPPED", error: "Google non connecté" });
          continue;
        }
        const res = await exportAllToSheet();
        const log = await logBackup({
          type: "GSHEETS_SYNC",
          format: "gsheets",
          destination: "drive",
          externalUrl: res.url,
          counts: res.counts as unknown as Record<string, number>,
          status: "OK",
          triggeredBy
        });
        results.push({ destination: "drive", status: "OK", backupLogId: log.id, externalUrl: res.url });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logBackup({
        type: dest === "drive" ? "GSHEETS_SYNC" : dest === "external" ? "EXTERNAL_FOLDER" : "LOCAL_BACKUP",
        format: dest === "drive" ? "gsheets" : "xlsx",
        destination: dest,
        counts: {},
        status: "FAILED",
        errorMessage: msg,
        triggeredBy
      }).catch(() => undefined);
      results.push({ destination: dest, status: "FAILED", error: msg });
    }
  }

  // Met à jour Config.backupLastRunAt si au moins un OK
  const anyOk = results.some((r) => r.status === "OK");
  if (anyOk) {
    await prisma.config.update({
      where: { id: "default" },
      data: { backupLastRunAt: new Date() }
    }).catch(() => undefined);

    // Rotation après sauvegarde locale ou externe réussie.
    const touchedLocalOrExternal = results.some(
      (r) => r.status === "OK" && (r.destination === "local" || r.destination === "external")
    );
    if (touchedLocalOrExternal) {
      try {
        const cfg = await prisma.config.findUnique({ where: { id: "default" } });
        const retentionDays = cfg?.backupRetentionDays ?? 30;
        const minKeep = cfg?.backupMinKeep ?? 7;

        // Dossier local par défaut
        await pruneLocalBackups({ retentionDays, minKeep });
        // Dossier externe si configuré
        if (cfg?.externalBackupFolder) {
          await pruneLocalBackups({ retentionDays, minKeep, dir: cfg.externalBackupFolder });
        }
      } catch (err) {
        // Best-effort : un échec de rotation ne doit pas faire échouer le backup
        if (process.env.NODE_ENV === "development") {
          console.error("[backup] rotation error:", err);
        }
      }
    }
  }

  return { results };
}

export type TimelineEntry = {
  id: string;
  kind: "backup" | "export" | "local_file";
  createdAt: string;
  type: string;
  destination: string;
  format: string;
  filePath?: string | null;
  externalUrl?: string | null;
  sizeBytes?: number | null;
  counts?: Record<string, number> | null;
  status: string;
  errorMessage?: string | null;
  triggeredBy?: string;
};

export async function getTimeline(limit = 100): Promise<TimelineEntry[]> {
  const [backups, exports, localFiles] = await Promise.all([
    prisma.backupLog.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    prisma.exportLog.findMany({
      where: { destination: { in: ["local_folder", "drive", "external_folder"] } },
      orderBy: { createdAt: "desc" },
      take: limit
    }),
    listBackups().catch(() => [])
  ]);

  const entries: TimelineEntry[] = [];

  for (const b of backups) {
    entries.push({
      id: `backup:${b.id}`,
      kind: "backup",
      createdAt: b.createdAt.toISOString(),
      type: b.type,
      destination: b.destination,
      format: b.format,
      filePath: b.filePath,
      externalUrl: b.externalUrl,
      sizeBytes: b.sizeBytes,
      counts: b.counts ? JSON.parse(b.counts) : null,
      status: b.status,
      errorMessage: b.errorMessage,
      triggeredBy: b.triggeredBy
    });
  }
  for (const e of exports) {
    entries.push({
      id: `export:${e.id}`,
      kind: "export",
      createdAt: e.createdAt.toISOString(),
      type: "EXPORT_COMPOSED",
      destination: e.destination,
      format: e.format,
      filePath: e.filePath,
      externalUrl: e.externalUrl,
      sizeBytes: e.sizeBytes,
      counts: e.rowCounts ? JSON.parse(e.rowCounts) : null,
      status: e.status,
      errorMessage: e.errorMessage
    });
  }
  // Fichiers locaux non journalisés (rétro-compat)
  const journaledFiles = new Set(
    [...backups, ...exports].map((r) => (r.filePath ? path.basename(r.filePath) : null)).filter(Boolean) as string[]
  );
  for (const f of localFiles) {
    if (journaledFiles.has(f.name)) continue;
    if (!BACKUP_FILENAME_PATTERN.test(f.name)) continue;
    entries.push({
      id: `file:${f.name}`,
      kind: "local_file",
      createdAt: f.mtime,
      type: "LOCAL_BACKUP",
      destination: "local_folder",
      format: f.kind,
      filePath: path.join(backupDir(), f.name),
      sizeBytes: f.size,
      status: "OK"
    });
  }
  entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return entries.slice(0, limit);
}

export type BackupHealth = {
  lastBackupAt: string | null;
  daysSinceLast: number | null;
  warningThresholdDays: number;
  status: "ok" | "warning" | "critical" | "unknown";
  nextScheduledAt: string | null;
  autoEnabled: boolean;
  intervalHours: number;
};

export async function getBackupHealth(): Promise<BackupHealth> {
  const [config, latest] = await Promise.all([
    prisma.config.findUnique({ where: { id: "default" } }),
    prisma.backupLog.findFirst({ where: { status: "OK" }, orderBy: { createdAt: "desc" } })
  ]);

  const warningThresholdDays = config?.backupWarningThresholdDays ?? 3;
  const intervalHours = config?.backupIntervalHours ?? 24;
  const autoEnabled = config?.backupAutoEnabled ?? true;
  const lastAt = latest?.createdAt ?? config?.backupLastRunAt ?? null;
  const daysSinceLast = lastAt ? Math.floor((Date.now() - lastAt.getTime()) / 86_400_000) : null;
  let status: BackupHealth["status"] = "unknown";
  if (daysSinceLast === null) status = "critical";
  else if (daysSinceLast >= warningThresholdDays * 2) status = "critical";
  else if (daysSinceLast >= warningThresholdDays) status = "warning";
  else status = "ok";

  const nextScheduledAt = lastAt && autoEnabled
    ? new Date(lastAt.getTime() + intervalHours * 3_600_000).toISOString()
    : null;

  return {
    lastBackupAt: lastAt ? lastAt.toISOString() : null,
    daysSinceLast,
    warningThresholdDays,
    status,
    nextScheduledAt,
    autoEnabled,
    intervalHours
  };
}
