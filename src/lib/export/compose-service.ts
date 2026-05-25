/**
 * Service applicatif d'export composé.
 * Lit la base selon le scope (tables + filtres + colonnes), produit un workbook ExcelJS,
 * un PDF ou un JSON. Retourne un Buffer pour download ou écrit dans un dossier.
 */

import ExcelJS from "exceljs";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import type { ExportScope, ExportTable } from "@/lib/validators/import-export";
import {
  FORMAT_CURRENCY,
  FORMAT_DATE_FR,
  FORMAT_DATETIME_FR,
  applyHumanReadableStyle,
  localizeStatus
} from "@/lib/excel/formatting";
import { backupDir } from "@/lib/backup/local-backup";

export type AvailableColumns = Record<ExportTable, { key: string; label: string }[]>;

export const AVAILABLE_COLUMNS: AvailableColumns = {
  patients: [
    { key: "nom", label: "Nom" },
    { key: "prenom", label: "Prénom" },
    { key: "dateNaissance", label: "Date de naissance" },
    { key: "email", label: "Email" },
    { key: "telephone", label: "Téléphone" },
    { key: "adresse", label: "Adresse" },
    { key: "numeroSecu", label: "N° Sécurité Sociale" },
    { key: "motifConsult", label: "Motif" },
    { key: "notesCliniques", label: "Notes cliniques" },
    { key: "actif", label: "Actif" },
    { key: "createdAt", label: "Créé le" },
    { key: "id", label: "ID" }
  ],
  seances: [
    { key: "date", label: "Date" },
    { key: "patient", label: "Patient" },
    { key: "dureeMinutes", label: "Durée (min)" },
    { key: "tarif", label: "Tarif" },
    { key: "statut", label: "Statut" },
    { key: "sourceImport", label: "Source" },
    { key: "doctolibRef", label: "Réf Doctolib" },
    { key: "notesSeance", label: "Notes" },
    { key: "id", label: "ID" }
  ],
  factures: [
    { key: "numero", label: "Numéro" },
    { key: "dateEmission", label: "Date émission" },
    { key: "dateEcheance", label: "Date échéance" },
    { key: "patient", label: "Patient" },
    { key: "montantHT", label: "Montant HT" },
    { key: "tva", label: "TVA" },
    { key: "montantTTC", label: "Montant TTC" },
    { key: "statut", label: "Statut" },
    { key: "datePaiement", label: "Payée le" },
    { key: "modePaiement", label: "Mode" },
    { key: "id", label: "ID" }
  ],
  kpi: [
    { key: "indicateur", label: "Indicateur" },
    { key: "valeur", label: "Valeur" },
    { key: "detail", label: "Détail" }
  ]
};

async function fetchPatients(scope: ExportScope) {
  const f = scope.filters;
  return prisma.patient.findMany({
    where: {
      id: f.patientIds && f.patientIds.length > 0 ? { in: f.patientIds } : undefined,
      tags: f.tagIds && f.tagIds.length > 0 ? { some: { tagId: { in: f.tagIds } } } : undefined
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }]
  });
}

async function fetchSeances(scope: ExportScope) {
  const f = scope.filters;
  return prisma.seance.findMany({
    where: {
      date: f.dateFrom || f.dateTo ? { gte: f.dateFrom, lte: f.dateTo } : undefined,
      statut: f.statusesSeance && f.statusesSeance.length > 0 ? { in: f.statusesSeance } : undefined,
      patientId: f.patientIds && f.patientIds.length > 0 ? { in: f.patientIds } : undefined,
      tags: f.tagIds && f.tagIds.length > 0 ? { some: { tagId: { in: f.tagIds } } } : undefined
    },
    orderBy: { date: "desc" },
    include: { patient: { select: { nom: true, prenom: true } } }
  });
}

async function fetchFactures(scope: ExportScope) {
  const f = scope.filters;
  return prisma.facture.findMany({
    where: {
      dateEmission: f.dateFrom || f.dateTo ? { gte: f.dateFrom, lte: f.dateTo } : undefined,
      statut: f.statusesFacture && f.statusesFacture.length > 0 ? { in: f.statusesFacture } : undefined,
      patientId: f.patientIds && f.patientIds.length > 0 ? { in: f.patientIds } : undefined,
      tags: f.tagIds && f.tagIds.length > 0 ? { some: { tagId: { in: f.tagIds } } } : undefined
    },
    orderBy: { dateEmission: "desc" },
    include: { patient: { select: { nom: true, prenom: true } } }
  });
}

async function buildKpiRows(scope: ExportScope) {
  const _ = scope;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const [seancesMois, facturesPayeesAn, patientsActifs, facturesEnRetard, seancesAn] =
    await Promise.all([
      prisma.seance.findMany({ where: { date: { gte: startOfMonth }, statut: "HONOREE" }, select: { tarif: true } }),
      prisma.facture.findMany({ where: { dateEmission: { gte: startOfYear }, statut: "PAYEE" }, select: { montantTTC: true } }),
      prisma.patient.count({ where: { actif: true } }),
      prisma.facture.count({ where: { statut: "EN_RETARD" } }),
      prisma.seance.findMany({ where: { date: { gte: startOfYear } }, select: { statut: true } })
    ]);
  const caMois = seancesMois.reduce((a, s) => a + s.tarif, 0);
  const caAnnee = facturesPayeesAn.reduce((a, f) => a + f.montantTTC, 0);
  const honorees = seancesAn.filter((s) => s.statut === "HONOREE").length;
  const tauxHonore = seancesAn.length ? honorees / seancesAn.length : 0;
  return [
    { indicateur: "CA du mois (séances honorées)", valeur: caMois, detail: "" },
    { indicateur: "CA cumulé année (factures payées)", valeur: caAnnee, detail: "" },
    { indicateur: "Patients actifs", valeur: patientsActifs, detail: "" },
    { indicateur: "Factures en retard", valeur: facturesEnRetard, detail: "" },
    { indicateur: "Séances honorées (année)", valeur: honorees, detail: `${seancesAn.length} séances totales` },
    { indicateur: "Taux d'honoration", valeur: tauxHonore, detail: "" }
  ];
}

type ComposedData = {
  patients: Awaited<ReturnType<typeof fetchPatients>>;
  seances: Awaited<ReturnType<typeof fetchSeances>>;
  factures: Awaited<ReturnType<typeof fetchFactures>>;
  kpi: Awaited<ReturnType<typeof buildKpiRows>>;
};

async function fetchData(scope: ExportScope): Promise<Partial<ComposedData>> {
  const out: Partial<ComposedData> = {};
  if (scope.tables.includes("patients")) out.patients = await fetchPatients(scope);
  if (scope.tables.includes("seances")) out.seances = await fetchSeances(scope);
  if (scope.tables.includes("factures")) out.factures = await fetchFactures(scope);
  if (scope.tables.includes("kpi")) out.kpi = await buildKpiRows(scope);
  return out;
}

function selectCols(scope: ExportScope, table: ExportTable): { key: string; label: string }[] {
  const requested = scope.columns?.[table];
  if (requested && requested.length > 0) {
    return AVAILABLE_COLUMNS[table].filter((c) => requested.includes(c.key));
  }
  return AVAILABLE_COLUMNS[table];
}

function patientLabel(p: { nom: string; prenom: string } | null | undefined): string {
  if (!p) return "";
  return `${p.prenom} ${p.nom}`;
}

function buildXlsx(scope: ExportScope, data: Partial<ComposedData>): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PsychHub";
  wb.created = new Date();

  if (data.patients) {
    const cols = selectCols(scope, "patients");
    const ws = wb.addWorksheet("Patients");
    ws.columns = cols.map((c) => ({ header: c.label, key: c.key, width: 18 }));
    for (const p of data.patients) {
      const row: Record<string, unknown> = {};
      for (const c of cols) {
        if (c.key === "actif") row[c.key] = (p as { actif: boolean }).actif ? "Oui" : "Non";
        else row[c.key] = (p as Record<string, unknown>)[c.key] ?? "";
      }
      ws.addRow(row);
    }
    if (cols.some((c) => c.key === "dateNaissance")) ws.getColumn("dateNaissance").numFmt = FORMAT_DATE_FR;
    if (cols.some((c) => c.key === "createdAt")) ws.getColumn("createdAt").numFmt = FORMAT_DATETIME_FR;
    applyHumanReadableStyle(ws);
  }

  if (data.seances) {
    const cols = selectCols(scope, "seances");
    const ws = wb.addWorksheet("Séances");
    ws.columns = cols.map((c) => ({ header: c.label, key: c.key, width: 16 }));
    let totalTarif = 0;
    for (const s of data.seances) {
      const row: Record<string, unknown> = {};
      for (const c of cols) {
        if (c.key === "patient") row.patient = patientLabel(s.patient);
        else if (c.key === "statut") row.statut = localizeStatus("Seance", s.statut);
        else row[c.key] = (s as Record<string, unknown>)[c.key] ?? "";
      }
      ws.addRow(row);
      if (s.statut === "HONOREE") totalTarif += s.tarif;
    }
    if (cols.some((c) => c.key === "date")) ws.getColumn("date").numFmt = FORMAT_DATETIME_FR;
    if (cols.some((c) => c.key === "tarif")) ws.getColumn("tarif").numFmt = FORMAT_CURRENCY;
    if (totalTarif > 0 && cols.some((c) => c.key === "tarif")) {
      const totalRow: Record<string, unknown> = { tarif: totalTarif };
      const firstKey = cols[0]?.key;
      if (firstKey) totalRow[firstKey] = "Total honoré";
      const r = ws.addRow(totalRow);
      r.font = { bold: true };
      r.getCell("tarif").numFmt = FORMAT_CURRENCY;
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
    }
    applyHumanReadableStyle(ws);
  }

  if (data.factures) {
    const cols = selectCols(scope, "factures");
    const ws = wb.addWorksheet("Factures");
    ws.columns = cols.map((c) => ({ header: c.label, key: c.key, width: 14 }));
    let totalHt = 0;
    let totalTtc = 0;
    for (const f of data.factures) {
      const row: Record<string, unknown> = {};
      for (const c of cols) {
        if (c.key === "patient") row.patient = patientLabel(f.patient);
        else if (c.key === "statut") row.statut = localizeStatus("Facture", f.statut);
        else row[c.key] = (f as Record<string, unknown>)[c.key] ?? "";
      }
      ws.addRow(row);
      totalHt += f.montantHT;
      totalTtc += f.montantTTC;
    }
    if (cols.some((c) => c.key === "dateEmission")) ws.getColumn("dateEmission").numFmt = FORMAT_DATE_FR;
    if (cols.some((c) => c.key === "dateEcheance")) ws.getColumn("dateEcheance").numFmt = FORMAT_DATE_FR;
    if (cols.some((c) => c.key === "datePaiement")) ws.getColumn("datePaiement").numFmt = FORMAT_DATE_FR;
    if (cols.some((c) => c.key === "montantHT")) ws.getColumn("montantHT").numFmt = FORMAT_CURRENCY;
    if (cols.some((c) => c.key === "montantTTC")) ws.getColumn("montantTTC").numFmt = FORMAT_CURRENCY;
    if (totalTtc > 0) {
      const totalRow: Record<string, unknown> = { montantHT: totalHt, montantTTC: totalTtc };
      const firstKey = cols[0]?.key;
      if (firstKey) totalRow[firstKey] = "TOTAL";
      const r = ws.addRow(totalRow);
      r.font = { bold: true };
      if (cols.some((c) => c.key === "montantHT")) r.getCell("montantHT").numFmt = FORMAT_CURRENCY;
      if (cols.some((c) => c.key === "montantTTC")) r.getCell("montantTTC").numFmt = FORMAT_CURRENCY;
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
    }
    applyHumanReadableStyle(ws);
  }

  if (data.kpi) {
    const ws = wb.addWorksheet("KPI");
    ws.columns = [
      { header: "Indicateur", key: "indicateur", width: 38 },
      { header: "Valeur", key: "valeur", width: 18 },
      { header: "Détail", key: "detail", width: 40 }
    ];
    for (const k of data.kpi) ws.addRow(k);
    applyHumanReadableStyle(ws);
  }

  return Promise.resolve(wb);
}

export type ComposeResult = {
  format: "xlsx" | "json";
  filename: string;
  buffer?: Buffer;
  filePath?: string;
  sizeBytes: number;
  counts: Record<string, number>;
};

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function countOf(data: Partial<ComposedData>): Record<string, number> {
  return {
    patients: data.patients?.length ?? 0,
    seances: data.seances?.length ?? 0,
    factures: data.factures?.length ?? 0,
    kpi: data.kpi?.length ?? 0
  };
}

export async function composeExport(scope: ExportScope): Promise<ComposeResult> {
  const data = await fetchData(scope);
  const counts = countOf(data);
  const stampStr = stamp();

  if (scope.format === "json") {
    const buffer = Buffer.from(JSON.stringify({ exportedAt: new Date().toISOString(), scope, data }, null, 2), "utf8");
    return {
      format: "json",
      filename: `psychhub-export-${stampStr}.json`,
      buffer,
      sizeBytes: buffer.byteLength,
      counts
    };
  }

  // Par défaut : xlsx (les autres formats redirigent ici pour MVP)
  const wb = await buildXlsx(scope, data);
  const arrayBuf = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuf as ArrayBuffer);
  return {
    format: "xlsx",
    filename: `psychhub-export-${stampStr}.xlsx`,
    buffer,
    sizeBytes: buffer.byteLength,
    counts
  };
}

export async function writeComposedExport(scope: ExportScope, destination: "local_folder" | "external_folder"): Promise<ComposeResult> {
  const res = await composeExport(scope);
  if (!res.buffer) throw new Error("Buffer vide");
  let dir: string;
  if (destination === "external_folder") {
    const config = await prisma.config.findUnique({ where: { id: "default" } });
    if (!config?.externalBackupFolder) throw new Error("Aucun dossier externe configuré.");
    dir = config.externalBackupFolder;
  } else {
    dir = backupDir();
  }
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, res.filename);
  await fs.writeFile(filePath, res.buffer);
  return { ...res, filePath, buffer: undefined };
}
