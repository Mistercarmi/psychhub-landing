import { sheets as sheetsApi, type sheets_v4 } from "@googleapis/sheets";
import { prisma } from "@/lib/db";
import { getAuthedClient } from "@/lib/google/oauth";

const TABS = ["Patients", "Seances", "Factures", "Config"] as const;
type TabName = (typeof TABS)[number];

const COLUMNS: Record<TabName, string[]> = {
  Patients: [
    "id",
    "nom",
    "prenom",
    "dateNaissance",
    "email",
    "telephone",
    "adresse",
    "numeroSecu",
    "motifConsult",
    "notesCliniques",
    "actif",
    "createdAt",
    "updatedAt"
  ],
  Seances: [
    "id",
    "patientId",
    "date",
    "dureeMinutes",
    "tarif",
    "statut",
    "sourceImport",
    "doctolibRef",
    "notesSeance",
    "factureId",
    "createdAt",
    "updatedAt"
  ],
  Factures: [
    "id",
    "numero",
    "patientId",
    "dateEmission",
    "dateEcheance",
    "montantHT",
    "montantTTC",
    "tva",
    "statut",
    "datePaiement",
    "modePaiement",
    "notes",
    "pdfPath",
    "createdAt",
    "updatedAt"
  ],
  Config: [
    "id",
    "cabinetNom",
    "praticienNom",
    "adresse",
    "telephone",
    "email",
    "siret",
    "adeli",
    "iban",
    "tarifDefaut",
    "dureeDefaut",
    "tvaDefaut",
    "prefixeFacture",
    "templateMailRelance",
    "templateMailConfirmation",
    "googleSheetBackupId",
    "updatedAt"
  ]
};

function toCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function rowsFromRecords(records: Record<string, unknown>[], cols: string[]) {
  return [cols, ...records.map((r) => cols.map((c) => toCell(r[c])))];
}

async function ensureSpreadsheet(sheets: sheets_v4.Sheets): Promise<string> {
  const config = await prisma.config.findUnique({ where: { id: "default" } });
  let sheetId = config?.googleSheetBackupId ?? null;

  if (sheetId) {
    try {
      await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      return sheetId;
    } catch {
      // Le sheet a été supprimé : on en crée un nouveau
      sheetId = null;
    }
  }

  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `PsychHub Backup — ${new Date().toISOString().slice(0, 10)}` },
      sheets: TABS.map((name) => ({ properties: { title: name } }))
    }
  });
  sheetId = created.data.spreadsheetId!;
  await prisma.config.update({
    where: { id: "default" },
    data: { googleSheetBackupId: sheetId }
  });
  return sheetId;
}

/**
 * Export complet — un onglet par table, écrasement complet à chaque export.
 */
export async function exportAllToSheet(): Promise<{ spreadsheetId: string; url: string; counts: Record<TabName, number> }> {
  const auth = await getAuthedClient();
  const sheets = sheetsApi({ version: "v4", auth });
  const spreadsheetId = await ensureSpreadsheet(sheets);

  const [patients, seances, factures, config] = await Promise.all([
    prisma.patient.findMany(),
    prisma.seance.findMany(),
    prisma.facture.findMany(),
    prisma.config.findMany()
  ]);

  // On exporte la config SANS le refresh token (jamais hors du poste).
  const configSanitized = config.map((c) => {
    const { googleRefreshToken: _omit, ...rest } = c;
    return rest;
  });

  const updates: { range: string; values: string[][] }[] = [
    { range: "Patients!A1", values: rowsFromRecords(patients as never, COLUMNS.Patients) },
    { range: "Seances!A1", values: rowsFromRecords(seances as never, COLUMNS.Seances) },
    { range: "Factures!A1", values: rowsFromRecords(factures as never, COLUMNS.Factures) },
    { range: "Config!A1", values: rowsFromRecords(configSanitized as never, COLUMNS.Config) }
  ];

  // Clear puis update pour chaque onglet
  for (const u of updates) {
    const tab = u.range.split("!")[0];
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tab}!A:Z` });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: u.range,
      valueInputOption: "RAW",
      requestBody: { values: u.values }
    });
  }

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    counts: {
      Patients: patients.length,
      Seances: seances.length,
      Factures: factures.length,
      Config: configSanitized.length
    }
  };
}

/**
 * Lit toutes les tables depuis le Google Sheet de backup et retourne un diff vs base locale.
 */
export type RestoreDiff = {
  spreadsheetId: string;
  url: string;
  diff: Record<TabName, { creates: number; updates: number; deletes: number }>;
  payload: Record<TabName, Record<string, unknown>[]>;
};

async function readTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: TabName
): Promise<Record<string, unknown>[]> {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:Z` });
  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];
  const [header, ...data] = rows;
  return data
    .filter((r) => r.some((c) => c !== "" && c != null))
    .map((r) => {
      const obj: Record<string, unknown> = {};
      header.forEach((col, i) => {
        obj[col] = r[i] ?? "";
      });
      return obj;
    });
}

function parseValue(col: string, value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return null;
  if (col.endsWith("At") || col === "date" || col === "dateNaissance" || col === "dateEmission" || col === "dateEcheance" || col === "datePaiement") {
    return new Date(String(value));
  }
  if (col === "actif") return String(value).toLowerCase() === "true";
  if (
    col === "tarif" ||
    col === "montantHT" ||
    col === "montantTTC" ||
    col === "tva" ||
    col === "tarifDefaut" ||
    col === "tvaDefaut"
  ) {
    return Number(value);
  }
  if (col === "dureeMinutes" || col === "dureeDefaut") return Number(value);
  return String(value);
}

function buildRecord(cols: string[], raw: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const col of cols) {
    if (col === "createdAt" || col === "updatedAt") continue;
    out[col] = parseValue(col, raw[col]);
  }
  return out;
}

export async function previewRestore(): Promise<RestoreDiff> {
  const auth = await getAuthedClient();
  const sheets = sheetsApi({ version: "v4", auth });
  const config = await prisma.config.findUnique({ where: { id: "default" } });
  const spreadsheetId = config?.googleSheetBackupId;
  if (!spreadsheetId) throw new Error("Aucun Google Sheet de backup configuré.");

  const [patientsSheet, seancesSheet, facturesSheet, configSheet] = await Promise.all([
    readTab(sheets, spreadsheetId, "Patients"),
    readTab(sheets, spreadsheetId, "Seances"),
    readTab(sheets, spreadsheetId, "Factures"),
    readTab(sheets, spreadsheetId, "Config")
  ]);

  const [patientsDb, seancesDb, facturesDb] = await Promise.all([
    prisma.patient.findMany({ select: { id: true } }),
    prisma.seance.findMany({ select: { id: true } }),
    prisma.facture.findMany({ select: { id: true } })
  ]);

  const diffOf = (
    sheet: Record<string, unknown>[],
    db: { id: string }[]
  ): { creates: number; updates: number; deletes: number } => {
    const dbIds = new Set(db.map((d) => d.id));
    const sheetIds = new Set(sheet.map((s) => String(s.id)));
    const creates = sheet.filter((s) => !dbIds.has(String(s.id))).length;
    const updates = sheet.filter((s) => dbIds.has(String(s.id))).length;
    const deletes = db.filter((d) => !sheetIds.has(d.id)).length;
    return { creates, updates, deletes };
  };

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    diff: {
      Patients: diffOf(patientsSheet, patientsDb),
      Seances: diffOf(seancesSheet, seancesDb),
      Factures: diffOf(facturesSheet, facturesDb),
      Config: { creates: 0, updates: configSheet.length, deletes: 0 }
    },
    payload: {
      Patients: patientsSheet,
      Seances: seancesSheet,
      Factures: facturesSheet,
      Config: configSheet
    }
  };
}

/**
 * Applique le restore : transaction qui remplace toutes les données par celles du sheet.
 * Préserve les IDs. Le refresh_token Google reste local.
 */
export async function applyRestore(payload: RestoreDiff["payload"]) {
  const patients = payload.Patients.map((r) => buildRecord(COLUMNS.Patients, r));
  const seances = payload.Seances.map((r) => buildRecord(COLUMNS.Seances, r));
  const factures = payload.Factures.map((r) => buildRecord(COLUMNS.Factures, r));

  await prisma.$transaction(async (tx) => {
    // On efface dans l'ordre inverse des relations.
    await tx.seance.deleteMany({});
    await tx.facture.deleteMany({});
    await tx.patient.deleteMany({});

    if (patients.length > 0) await tx.patient.createMany({ data: patients as never });
    if (factures.length > 0) await tx.facture.createMany({ data: factures as never });
    if (seances.length > 0) await tx.seance.createMany({ data: seances as never });

    if (payload.Config.length > 0) {
      const c = buildRecord(COLUMNS.Config, payload.Config[0]);
      delete (c as { id?: unknown }).id;
      await tx.config.update({ where: { id: "default" }, data: c as never });
    }
  });

  return {
    patients: patients.length,
    seances: seances.length,
    factures: factures.length
  };
}
