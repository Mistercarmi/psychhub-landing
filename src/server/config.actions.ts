"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { configSchema, type ConfigInput } from "@/lib/validators/config";

export async function getConfig() {
  return prisma.config.findUnique({ where: { id: "default" } });
}

export async function updateConfig(input: ConfigInput) {
  const parsed = configSchema.parse(input);
  const cleaned: Record<string, unknown> = { ...parsed };
  for (const k of Object.keys(cleaned)) {
    if (cleaned[k] === "") cleaned[k] = null;
  }
  await prisma.config.upsert({
    where: { id: "default" },
    create: { id: "default", ...(cleaned as Record<string, unknown>) } as never,
    update: cleaned as never
  });
  revalidatePath("/parametres");
  revalidatePath("/dashboard");
}

export async function disconnectGoogle() {
  await prisma.config.update({
    where: { id: "default" },
    data: {
      googleRefreshToken: null,
      googleConnectedAt: null,
      googleAccountEmail: null
    }
  });
  revalidatePath("/parametres");
  revalidatePath("/import-export");
}

export type BackupConfigInput = {
  backupAutoEnabled?: boolean;
  backupIntervalHours?: number;
  backupWarningThresholdDays?: number;
  externalBackupFolder?: string | null;
  backupDestinationsJson?: string | null;
};

/**
 * Restaure les paramètres aux valeurs par défaut (préserve l'OAuth Google et la config backup
 * pour ne pas casser des intégrations en cours).
 */
export async function resetConfigDefaults() {
  await prisma.config.update({
    where: { id: "default" },
    data: {
      cabinetNom: null,
      praticienNom: null,
      adresse: null,
      telephone: null,
      email: null,
      siret: null,
      adeli: null,
      iban: null,
      tarifDefaut: 60,
      dureeDefaut: 50,
      tvaDefaut: 0,
      prefixeFacture: "F",
      templateMailRelance: null,
      templateMailConfirmation: null,
      templateMailRappelSeance: null,
      rappelsActifs: false,
      rappelsHeuresAvant: 24
    } as never
  });
  revalidatePath("/parametres");
}

/**
 * Exporte la config (hors secrets : token Google) au format JSON sérialisable.
 */
export async function exportConfigJson(): Promise<string> {
  const cfg = await prisma.config.findUnique({ where: { id: "default" } });
  if (!cfg) return JSON.stringify({});
  const c = cfg as Record<string, unknown>;
  const SECRET_KEYS = new Set([
    "googleRefreshToken",
    "googleSheetBackupId",
    "googleAccessMode",
    "googleConnectedAt",
    "googleAccountEmail",
    "id",
    "updatedAt"
  ]);
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(c)) {
    if (!SECRET_KEYS.has(k)) safe[k] = v;
  }
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), config: safe }, null, 2);
}

/**
 * Importe une config JSON exportée. N'écrase pas l'OAuth Google ni l'IBAN/SIRET si déjà présents
 * et non fournis dans l'import.
 */
export async function importConfigJson(raw: string): Promise<{ updatedFields: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Fichier JSON invalide");
  }
  if (typeof parsed !== "object" || parsed === null) throw new Error("Format inattendu");
  const data = (parsed as { config?: Record<string, unknown> }).config ?? parsed;
  if (typeof data !== "object" || data === null) throw new Error("Champ `config` introuvable");

  const SECRET_KEYS = new Set([
    "googleRefreshToken",
    "googleSheetBackupId",
    "googleAccessMode",
    "googleConnectedAt",
    "googleAccountEmail",
    "id",
    "updatedAt"
  ]);
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (!SECRET_KEYS.has(k)) filtered[k] = v;
  }
  await prisma.config.update({ where: { id: "default" }, data: filtered as never });
  revalidatePath("/parametres");
  return { updatedFields: Object.keys(filtered).length };
}

export async function updateBackupConfig(input: BackupConfigInput) {
  const data: Record<string, unknown> = {};
  if (input.backupAutoEnabled !== undefined) data.backupAutoEnabled = input.backupAutoEnabled;
  if (input.backupIntervalHours !== undefined) data.backupIntervalHours = Math.max(1, Math.min(168, Math.floor(input.backupIntervalHours)));
  if (input.backupWarningThresholdDays !== undefined) data.backupWarningThresholdDays = Math.max(1, Math.min(60, Math.floor(input.backupWarningThresholdDays)));
  if (input.externalBackupFolder !== undefined) data.externalBackupFolder = input.externalBackupFolder || null;
  if (input.backupDestinationsJson !== undefined) data.backupDestinationsJson = input.backupDestinationsJson;

  await prisma.config.update({ where: { id: "default" }, data });
  revalidatePath("/sauvegardes");
  revalidatePath("/parametres");
}
