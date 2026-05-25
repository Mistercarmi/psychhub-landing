/**
 * Scheduler simple pour sauvegardes automatiques.
 * - S'initialise idempotemment au premier appel (process Node persistant).
 * - Lit `Config.backupAutoEnabled` et `backupIntervalHours` à chaque tick.
 * - Si `now - backupLastRunAt >= interval`, déclenche `runBackup` avec
 *   toutes les destinations disponibles (local + drive si OAuth + external si configuré).
 * - Pas de `node-cron` : `setInterval` suffit en mono-poste.
 */

import { prisma } from "@/lib/db";
import { runBackup, type BackupDestination } from "@/lib/backup/service";

const globalKey = "__psychhub_scheduler__";
type GlobalWithScheduler = typeof globalThis & {
  [globalKey]?: {
    started: boolean;
    timer: NodeJS.Timeout | null;
    running: boolean;
  };
};

function state() {
  const g = globalThis as GlobalWithScheduler;
  if (!g[globalKey]) g[globalKey] = { started: false, timer: null, running: false };
  return g[globalKey]!;
}

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // tick chaque heure (rapide à vérifier, coût négligeable)

async function tick(): Promise<void> {
  const s = state();
  if (s.running) return;
  s.running = true;
  try {
    const config = await prisma.config.findUnique({ where: { id: "default" } });
    if (!config?.backupAutoEnabled) return;
    const intervalMs = Math.max(1, config.backupIntervalHours) * 3_600_000;
    const last = config.backupLastRunAt?.getTime() ?? 0;
    if (Date.now() - last < intervalMs) return;

    const destinations: BackupDestination[] = ["local"];
    if (config.googleRefreshToken) destinations.push("drive");
    if (config.externalBackupFolder) destinations.push("external");

    await runBackup({ destinations, triggeredBy: "scheduled" });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[scheduler] tick error:", err);
    }
  } finally {
    s.running = false;
  }
}

export function initScheduler(): void {
  if (typeof window !== "undefined") return; // côté client : ignore
  const s = state();
  if (s.started) return;
  s.started = true;

  // Tick immédiat (rattrape une sauvegarde manquée au démarrage)
  void tick();
  s.timer = setInterval(() => void tick(), CHECK_INTERVAL_MS);

  if (process.env.NODE_ENV === "development") {
    console.log("[scheduler] initialisé (check toutes les heures)");
  }
}

export function stopScheduler(): void {
  const s = state();
  if (s.timer) {
    clearInterval(s.timer);
    s.timer = null;
  }
  s.started = false;
}

export async function nextRunAt(): Promise<Date | null> {
  const config = await prisma.config.findUnique({ where: { id: "default" } });
  if (!config?.backupAutoEnabled) return null;
  const last = config.backupLastRunAt?.getTime() ?? Date.now();
  return new Date(last + config.backupIntervalHours * 3_600_000);
}
