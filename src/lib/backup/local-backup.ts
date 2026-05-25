import path from "node:path";
import fs from "node:fs/promises";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import {
  FORMAT_CURRENCY,
  FORMAT_DATETIME_FR,
  FORMAT_DATE_FR,
  applyHumanReadableStyle,
  localizeStatus
} from "@/lib/excel/formatting";

export const BACKUP_DIR_NAME = "Sauvegarde";

export function backupDir(): string {
  return path.join(process.cwd(), BACKUP_DIR_NAME);
}

export const BACKUP_FILENAME_PATTERN = /^psychhub-backup-\d{4}-\d{2}-\d{2}-\d{4}\.(xlsx|json)$/;

function ts(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

type Snapshot = {
  patients: Awaited<ReturnType<typeof prisma.patient.findMany>>;
  seances: Awaited<ReturnType<typeof prisma.seance.findMany>>;
  factures: Awaited<ReturnType<typeof prisma.facture.findMany>>;
  config: Awaited<ReturnType<typeof prisma.config.findMany>>;
  tags: Awaited<ReturnType<typeof prisma.tag.findMany>>;
  templates: Awaited<ReturnType<typeof prisma.seanceTemplate.findMany>>;
};

async function readSnapshot(): Promise<Snapshot> {
  const [patients, seances, factures, config, tags, templates] = await Promise.all([
    prisma.patient.findMany({ orderBy: { nom: "asc" } }),
    prisma.seance.findMany({ orderBy: { date: "desc" } }),
    prisma.facture.findMany({ orderBy: { dateEmission: "desc" } }),
    prisma.config.findMany(),
    prisma.tag.findMany(),
    prisma.seanceTemplate.findMany()
  ]);
  return { patients, seances, factures, config, tags, templates };
}

function sanitizeConfig(c: Record<string, unknown>) {
  // Le refresh_token Google ne quitte jamais le poste — on l'exclut du backup.
  const { googleRefreshToken: _omit, ...rest } = c as { googleRefreshToken?: unknown };
  return rest;
}

const HEADERS = {
  patients: [
    { key: "id", label: "ID" },
    { key: "nom", label: "Nom" },
    { key: "prenom", label: "Prénom" },
    { key: "dateNaissance", label: "Date de naissance" },
    { key: "email", label: "Email" },
    { key: "telephone", label: "Téléphone" },
    { key: "adresse", label: "Adresse" },
    { key: "numeroSecu", label: "N° Sécurité Sociale" },
    { key: "motifConsult", label: "Motif de consultation" },
    { key: "notesCliniques", label: "Notes cliniques" },
    { key: "actif", label: "Actif" },
    { key: "createdAt", label: "Créé le" },
    { key: "updatedAt", label: "Modifié le" }
  ],
  seances: [
    { key: "id", label: "ID" },
    { key: "patientId", label: "ID Patient" },
    { key: "date", label: "Date" },
    { key: "dureeMinutes", label: "Durée (min)" },
    { key: "tarif", label: "Tarif (€)" },
    { key: "statut", label: "Statut" },
    { key: "sourceImport", label: "Source import" },
    { key: "doctolibRef", label: "Réf Doctolib" },
    { key: "notesSeance", label: "Notes de séance" },
    { key: "factureId", label: "ID Facture" },
    { key: "createdAt", label: "Créé le" },
    { key: "updatedAt", label: "Modifié le" }
  ],
  factures: [
    { key: "id", label: "ID" },
    { key: "numero", label: "Numéro" },
    { key: "patientId", label: "ID Patient" },
    { key: "dateEmission", label: "Date émission" },
    { key: "dateEcheance", label: "Date échéance" },
    { key: "montantHT", label: "Montant HT (€)" },
    { key: "montantTTC", label: "Montant TTC (€)" },
    { key: "tva", label: "TVA (%)" },
    { key: "statut", label: "Statut" },
    { key: "datePaiement", label: "Date paiement" },
    { key: "modePaiement", label: "Mode paiement" },
    { key: "notes", label: "Notes" },
    { key: "createdAt", label: "Créé le" },
    { key: "updatedAt", label: "Modifié le" }
  ],
  config: [
    { key: "id", label: "ID" },
    { key: "cabinetNom", label: "Nom cabinet" },
    { key: "praticienNom", label: "Nom praticien" },
    { key: "adresse", label: "Adresse" },
    { key: "telephone", label: "Téléphone" },
    { key: "email", label: "Email" },
    { key: "siret", label: "SIRET" },
    { key: "adeli", label: "ADELI" },
    { key: "iban", label: "IBAN" },
    { key: "tarifDefaut", label: "Tarif défaut (€)" },
    { key: "dureeDefaut", label: "Durée défaut (min)" },
    { key: "tvaDefaut", label: "TVA défaut (%)" },
    { key: "prefixeFacture", label: "Préfixe facture" },
    { key: "googleAccessMode", label: "Mode accès Google" },
    { key: "googleAccountEmail", label: "Compte Google" },
    { key: "googleConnectedAt", label: "Connecté le" },
    { key: "googleSheetBackupId", label: "ID Sheet backup" },
    { key: "updatedAt", label: "Modifié le" }
  ],
  tags: [
    { key: "id", label: "ID" },
    { key: "name", label: "Nom" },
    { key: "color", label: "Couleur" },
    { key: "createdAt", label: "Créé le" }
  ],
  templates: [
    { key: "id", label: "ID" },
    { key: "name", label: "Nom" },
    { key: "dureeMinutes", label: "Durée (min)" },
    { key: "tarif", label: "Tarif (€)" },
    { key: "motifType", label: "Type motif" },
    { key: "notesBase", label: "Notes de base" },
    { key: "createdAt", label: "Créé le" },
    { key: "updatedAt", label: "Modifié le" }
  ]
} as const;

function toCell(value: unknown): unknown {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value;
  return value;
}

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  cols: ReadonlyArray<{ key: string; label: string }>,
  rows: Record<string, unknown>[]
) {
  const ws = wb.addWorksheet(name);
  ws.columns = cols.map((c) => ({ header: c.label, key: c.key, width: Math.max(12, c.label.length + 2) }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8E8E8" }
  };
  for (const r of rows) {
    const row: Record<string, unknown> = {};
    for (const c of cols) row[c.key] = toCell(r[c.key]);
    ws.addRow(row);
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

export async function buildBackupWorkbook(snapshot?: Snapshot): Promise<ExcelJS.Workbook> {
  const data = snapshot ?? (await readSnapshot());
  const wb = new ExcelJS.Workbook();
  wb.creator = "PsychHub";
  wb.created = new Date();

  addSheet(wb, "Patients", HEADERS.patients, data.patients as unknown as Record<string, unknown>[]);
  addSheet(wb, "Séances", HEADERS.seances, data.seances as unknown as Record<string, unknown>[]);
  addSheet(wb, "Factures", HEADERS.factures, data.factures as unknown as Record<string, unknown>[]);
  addSheet(
    wb,
    "Configuration",
    HEADERS.config,
    data.config.map(sanitizeConfig) as unknown as Record<string, unknown>[]
  );
  addSheet(wb, "Tags", HEADERS.tags, data.tags as unknown as Record<string, unknown>[]);
  addSheet(wb, "Templates", HEADERS.templates, data.templates as unknown as Record<string, unknown>[]);

  return wb;
}

export async function buildBackupJson(): Promise<{ snapshot: Snapshot; sanitized: Record<string, unknown> }> {
  const snapshot = await readSnapshot();
  const sanitized = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    patients: snapshot.patients,
    seances: snapshot.seances,
    factures: snapshot.factures,
    config: snapshot.config.map(sanitizeConfig),
    tags: snapshot.tags,
    templates: snapshot.templates
  };
  return { snapshot, sanitized };
}

export type LocalBackupResult = {
  xlsx: string;
  json: string;
  counts: { patients: number; seances: number; factures: number };
};

export async function writeLocalBackup(): Promise<LocalBackupResult> {
  const dir = backupDir();
  await fs.mkdir(dir, { recursive: true });

  const stamp = ts();
  const xlsxPath = path.join(dir, `psychhub-backup-${stamp}.xlsx`);
  const jsonPath = path.join(dir, `psychhub-backup-${stamp}.json`);

  const { snapshot, sanitized } = await buildBackupJson();
  const wb = await buildBackupWorkbook(snapshot);
  await wb.xlsx.writeFile(xlsxPath);
  await fs.writeFile(jsonPath, JSON.stringify(sanitized, null, 2), "utf8");

  return {
    xlsx: path.basename(xlsxPath),
    json: path.basename(jsonPath),
    counts: {
      patients: snapshot.patients.length,
      seances: snapshot.seances.length,
      factures: snapshot.factures.length
    }
  };
}

export type BackupFile = {
  name: string;
  size: number;
  mtime: string;
  kind: "xlsx" | "json";
};

export async function listBackups(): Promise<BackupFile[]> {
  const dir = backupDir();
  try {
    const entries = await fs.readdir(dir);
    const out: BackupFile[] = [];
    for (const name of entries) {
      if (!BACKUP_FILENAME_PATTERN.test(name)) continue;
      const stat = await fs.stat(path.join(dir, name));
      out.push({
        name,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        kind: name.endsWith(".xlsx") ? "xlsx" : "json"
      });
    }
    return out.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  } catch {
    return [];
  }
}

export function resolveBackupFile(filename: string): string | null {
  if (!BACKUP_FILENAME_PATTERN.test(filename)) return null;
  return path.join(backupDir(), filename);
}

// ============================================================
// Snapshot humain-lisible (P3)
// ============================================================

export const HUMAN_SNAPSHOT_FILENAME_PATTERN = /^psychhub-snapshot-\d{4}-\d{2}-\d{2}-\d{4}\.xlsx$/;

type HumanSheetSpec = {
  label: string;
  emoji?: string;
  description: string;
  rowCount: number;
};

async function readKpis() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  const [
    seancesMois,
    seancesAn,
    facturesPayeesAn,
    facturesEnRetard,
    facturesImpayees,
    seancesHonoreesAn,
    seancesAnnuleesAn,
    patientsActifs,
    nouveauxPatients30j
  ] = await Promise.all([
    prisma.seance.findMany({ where: { date: { gte: startOfMonth }, statut: "HONOREE" }, select: { tarif: true } }),
    prisma.seance.findMany({ where: { date: { gte: startOfYear } }, select: { statut: true } }),
    prisma.facture.findMany({ where: { dateEmission: { gte: startOfYear }, statut: "PAYEE" }, select: { montantTTC: true } }),
    prisma.facture.count({ where: { statut: "EN_RETARD" } }),
    prisma.facture.count({ where: { statut: { in: ["EMISE", "EN_RETARD"] } } }),
    prisma.seance.count({ where: { date: { gte: startOfYear }, statut: "HONOREE" } }),
    prisma.seance.count({ where: { date: { gte: startOfYear }, statut: { in: ["ANNULEE_PATIENT", "ANNULEE_PRATICIEN", "ABSENCE"] } } }),
    prisma.patient.count({ where: { actif: true } }),
    prisma.patient.count({ where: { createdAt: { gte: thirtyAgo } } })
  ]);

  const caMois = seancesMois.reduce((a, s) => a + s.tarif, 0);
  const caAnnee = facturesPayeesAn.reduce((a, f) => a + f.montantTTC, 0);
  const totalSeancesAn = seancesAn.length;
  const tauxHonore = totalSeancesAn > 0 ? seancesHonoreesAn / totalSeancesAn : 0;
  const tauxAnnulation = totalSeancesAn > 0 ? seancesAnnuleesAn / totalSeancesAn : 0;

  return {
    caMois,
    caAnnee,
    facturesEnRetard,
    facturesImpayees,
    patientsActifs,
    nouveauxPatients30j,
    seancesHonoreesAn,
    tauxHonore,
    tauxAnnulation,
    totalSeancesAn
  };
}

function addHumanSommaire(wb: ExcelJS.Workbook, specs: HumanSheetSpec[], meta: { exportedAt: Date; totalRows: number }) {
  const ws = wb.addWorksheet("Sommaire");
  ws.columns = [
    { header: "Onglet", key: "tab", width: 28 },
    { header: "Description", key: "desc", width: 60 },
    { header: "Lignes", key: "rows", width: 12 },
    { header: "Aller à", key: "link", width: 16 }
  ];
  applyHumanReadableStyle(ws);
  ws.addRow({ tab: "Méta", desc: "Informations sur l'export et le cabinet", rows: "", link: { text: "Ouvrir", hyperlink: "#'Méta'!A1" } });
  for (const s of specs) {
    ws.addRow({
      tab: `${s.emoji ?? ""} ${s.label}`.trim(),
      desc: s.description,
      rows: s.rowCount,
      link: { text: "Ouvrir", hyperlink: `#'${s.label}'!A1` }
    });
  }
  const total = ws.addRow({ tab: "Total", desc: `Snapshot du ${meta.exportedAt.toLocaleString("fr-FR")}`, rows: meta.totalRows, link: "" });
  total.font = { bold: true };
  total.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
}

function addHumanMeta(
  wb: ExcelJS.Workbook,
  config: { cabinetNom?: string | null; praticienNom?: string | null; siret?: string | null; adeli?: string | null } | null,
  counts: Record<string, number>,
  exportedAt: Date
) {
  const ws = wb.addWorksheet("Méta");
  ws.columns = [
    { header: "Clé", key: "key", width: 32 },
    { header: "Valeur", key: "value", width: 60 }
  ];
  applyHumanReadableStyle(ws);
  ws.addRow({ key: "Date de génération", value: exportedAt.toLocaleString("fr-FR") });
  ws.addRow({ key: "Version du schéma", value: 2 });
  ws.addRow({ key: "Cabinet", value: config?.cabinetNom ?? "—" });
  ws.addRow({ key: "Praticien", value: config?.praticienNom ?? "—" });
  ws.addRow({ key: "SIRET", value: config?.siret ?? "—" });
  ws.addRow({ key: "ADELI", value: config?.adeli ?? "—" });
  const sep = ws.addRow({ key: "—", value: "" });
  sep.font = { italic: true };
  for (const [k, v] of Object.entries(counts)) {
    ws.addRow({ key: `Total ${k}`, value: v });
  }
}

function addHumanPatients(wb: ExcelJS.Workbook, rows: Snapshot["patients"]) {
  const ws = wb.addWorksheet("Patients");
  ws.columns = [
    { header: "Nom", key: "nom", width: 18 },
    { header: "Prénom", key: "prenom", width: 16 },
    { header: "Date de naissance", key: "dateNaissance", width: 16 },
    { header: "Email", key: "email", width: 28 },
    { header: "Téléphone", key: "telephone", width: 16 },
    { header: "Adresse", key: "adresse", width: 36 },
    { header: "Motif", key: "motifConsult", width: 24 },
    { header: "Actif", key: "actif", width: 8 },
    { header: "Créé le", key: "createdAt", width: 18 },
    { header: "ID", key: "id", width: 28 }
  ];
  for (const p of rows) {
    ws.addRow({
      nom: p.nom,
      prenom: p.prenom,
      dateNaissance: p.dateNaissance,
      email: p.email ?? "",
      telephone: p.telephone ?? "",
      adresse: p.adresse ?? "",
      motifConsult: p.motifConsult ?? "",
      actif: p.actif ? "Oui" : "Non",
      createdAt: p.createdAt,
      id: p.id
    });
  }
  ws.getColumn("dateNaissance").numFmt = FORMAT_DATE_FR;
  ws.getColumn("createdAt").numFmt = FORMAT_DATETIME_FR;
  applyHumanReadableStyle(ws);
}

function addHumanSeances(wb: ExcelJS.Workbook, rows: Snapshot["seances"], patientsById: Map<string, { nom: string; prenom: string }>) {
  const ws = wb.addWorksheet("Séances");
  ws.columns = [
    { header: "Date", key: "date", width: 18 },
    { header: "Patient", key: "patient", width: 24 },
    { header: "Durée (min)", key: "duree", width: 12 },
    { header: "Tarif", key: "tarif", width: 12 },
    { header: "Statut", key: "statut", width: 18 },
    { header: "Source", key: "source", width: 12 },
    { header: "Notes", key: "notes", width: 36 },
    { header: "ID", key: "id", width: 28 }
  ];
  let totalTarif = 0;
  for (const s of rows) {
    const p = patientsById.get(s.patientId);
    ws.addRow({
      date: s.date,
      patient: p ? `${p.prenom} ${p.nom}` : s.patientId,
      duree: s.dureeMinutes,
      tarif: s.tarif,
      statut: localizeStatus("Seance", s.statut),
      source: s.sourceImport ?? "manuel",
      notes: s.notesSeance ?? "",
      id: s.id
    });
    if (s.statut === "HONOREE") totalTarif += s.tarif;
  }
  ws.getColumn("date").numFmt = FORMAT_DATETIME_FR;
  ws.getColumn("tarif").numFmt = FORMAT_CURRENCY;
  // Ligne totaux
  const totalRow = ws.addRow({
    date: "",
    patient: "Total honoré",
    duree: "",
    tarif: totalTarif,
    statut: "",
    source: "",
    notes: "",
    id: ""
  });
  totalRow.font = { bold: true };
  totalRow.getCell("tarif").numFmt = FORMAT_CURRENCY;
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  applyHumanReadableStyle(ws);
}

function addHumanFactures(wb: ExcelJS.Workbook, rows: Snapshot["factures"], patientsById: Map<string, { nom: string; prenom: string }>) {
  const ws = wb.addWorksheet("Factures");
  ws.columns = [
    { header: "Numéro", key: "numero", width: 16 },
    { header: "Date émission", key: "dateEmission", width: 14 },
    { header: "Date échéance", key: "dateEcheance", width: 14 },
    { header: "Patient", key: "patient", width: 24 },
    { header: "Montant HT", key: "ht", width: 14 },
    { header: "TVA", key: "tva", width: 8 },
    { header: "Montant TTC", key: "ttc", width: 14 },
    { header: "Statut", key: "statut", width: 14 },
    { header: "Payée le", key: "datePaiement", width: 14 },
    { header: "Mode", key: "mode", width: 14 },
    { header: "ID", key: "id", width: 28 }
  ];
  let totalHt = 0;
  let totalTtc = 0;
  for (const f of rows) {
    const p = patientsById.get(f.patientId);
    const row = ws.addRow({
      numero: f.numero,
      dateEmission: f.dateEmission,
      dateEcheance: f.dateEcheance,
      patient: p ? `${p.prenom} ${p.nom}` : f.patientId,
      ht: f.montantHT,
      tva: f.tva,
      ttc: f.montantTTC,
      statut: localizeStatus("Facture", f.statut),
      datePaiement: f.datePaiement,
      mode: f.modePaiement ?? "",
      id: f.id
    });
    if (f.statut === "PAYEE") {
      row.getCell("statut").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    } else if (f.statut === "EN_RETARD") {
      row.getCell("statut").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
    }
    totalHt += f.montantHT;
    totalTtc += f.montantTTC;
  }
  ws.getColumn("dateEmission").numFmt = FORMAT_DATE_FR;
  ws.getColumn("dateEcheance").numFmt = FORMAT_DATE_FR;
  ws.getColumn("datePaiement").numFmt = FORMAT_DATE_FR;
  ws.getColumn("ht").numFmt = FORMAT_CURRENCY;
  ws.getColumn("ttc").numFmt = FORMAT_CURRENCY;
  const totalRow = ws.addRow({
    numero: "TOTAL",
    dateEmission: "",
    dateEcheance: "",
    patient: "",
    ht: totalHt,
    tva: "",
    ttc: totalTtc,
    statut: "",
    datePaiement: "",
    mode: "",
    id: ""
  });
  totalRow.font = { bold: true };
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  totalRow.getCell("ht").numFmt = FORMAT_CURRENCY;
  totalRow.getCell("ttc").numFmt = FORMAT_CURRENCY;
  applyHumanReadableStyle(ws);
}

function addHumanKpi(wb: ExcelJS.Workbook, kpi: Awaited<ReturnType<typeof readKpis>>) {
  const ws = wb.addWorksheet("KPI synthèse");
  ws.columns = [
    { header: "Indicateur", key: "k", width: 36 },
    { header: "Valeur", key: "v", width: 18 },
    { header: "Détail", key: "d", width: 50 }
  ];
  ws.addRow({ k: "Chiffre d'affaires du mois (séances honorées)", v: kpi.caMois, d: "Somme des tarifs des séances HONOREE du mois en cours" });
  ws.addRow({ k: "Chiffre d'affaires cumulé année (factures payées)", v: kpi.caAnnee, d: "Somme des montantTTC des factures PAYEE depuis le 1er janvier" });
  ws.addRow({ k: "Patients actifs", v: kpi.patientsActifs, d: "" });
  ws.addRow({ k: "Nouveaux patients (30 derniers jours)", v: kpi.nouveauxPatients30j, d: "" });
  ws.addRow({ k: "Séances honorées (année)", v: kpi.seancesHonoreesAn, d: "" });
  ws.addRow({ k: "Taux d'honoration", v: kpi.tauxHonore, d: `Sur ${kpi.totalSeancesAn} séances de l'année` });
  ws.addRow({ k: "Taux d'annulation", v: kpi.tauxAnnulation, d: `Sur ${kpi.totalSeancesAn} séances de l'année` });
  ws.addRow({ k: "Factures impayées", v: kpi.facturesImpayees, d: "EMISE + EN_RETARD" });
  ws.addRow({ k: "Factures en retard", v: kpi.facturesEnRetard, d: "" });
  // Formats
  ws.getCell("B2").numFmt = FORMAT_CURRENCY;
  ws.getCell("B3").numFmt = FORMAT_CURRENCY;
  ws.getCell("B7").numFmt = "0.0%";
  ws.getCell("B8").numFmt = "0.0%";
  applyHumanReadableStyle(ws);
}

function addHumanAudit(wb: ExcelJS.Workbook, rows: Array<{ entityType: string; entityId: string | null; action: string; createdAt: Date }>) {
  const ws = wb.addWorksheet("Journal");
  ws.columns = [
    { header: "Date", key: "date", width: 20 },
    { header: "Entité", key: "ent", width: 16 },
    { header: "Action", key: "act", width: 14 },
    { header: "Identifiant", key: "id", width: 30 }
  ];
  for (const r of rows) {
    ws.addRow({
      date: r.createdAt,
      ent: r.entityType,
      act: r.action,
      id: r.entityId ?? "—"
    });
  }
  ws.getColumn("date").numFmt = FORMAT_DATETIME_FR;
  applyHumanReadableStyle(ws);
}

function addHumanTags(wb: ExcelJS.Workbook, rows: Snapshot["tags"]) {
  const ws = wb.addWorksheet("Tags");
  ws.columns = [
    { header: "Nom", key: "name", width: 24 },
    { header: "Couleur", key: "color", width: 18 },
    { header: "Créé le", key: "createdAt", width: 18 }
  ];
  for (const t of rows) {
    const row = ws.addRow({ name: t.name, color: t.color ?? "", createdAt: t.createdAt });
    if (t.color && /^#?[0-9a-fA-F]{6}$/.test(t.color)) {
      const argb = "FF" + t.color.replace("#", "");
      row.getCell("color").fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
    }
  }
  ws.getColumn("createdAt").numFmt = FORMAT_DATETIME_FR;
  applyHumanReadableStyle(ws);
}

function addHumanTemplates(wb: ExcelJS.Workbook, rows: Snapshot["templates"]) {
  const ws = wb.addWorksheet("Modèles séances");
  ws.columns = [
    { header: "Nom", key: "name", width: 24 },
    { header: "Durée (min)", key: "duree", width: 12 },
    { header: "Tarif", key: "tarif", width: 12 },
    { header: "Motif", key: "motif", width: 24 },
    { header: "Notes de base", key: "notes", width: 40 }
  ];
  for (const t of rows) {
    ws.addRow({ name: t.name, duree: t.dureeMinutes, tarif: t.tarif, motif: t.motifType ?? "", notes: t.notesBase ?? "" });
  }
  ws.getColumn("tarif").numFmt = FORMAT_CURRENCY;
  applyHumanReadableStyle(ws);
}

export async function buildHumanReadableSnapshot(): Promise<ExcelJS.Workbook> {
  const exportedAt = new Date();
  const [snapshot, kpi, audit] = await Promise.all([
    readSnapshot(),
    readKpis(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 500 })
  ]);

  const patientsById = new Map(snapshot.patients.map((p) => [p.id, { nom: p.nom, prenom: p.prenom }]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "PsychHub";
  wb.created = exportedAt;
  wb.subject = "Snapshot complet de la base PsychHub";

  // Note : Sommaire ajouté en premier mais rempli après pour avoir les counts
  const sommairePlaceholder = wb.addWorksheet("Sommaire");
  sommairePlaceholder.state = "visible";

  addHumanMeta(wb, snapshot.config[0] ?? null, {
    Patients: snapshot.patients.length,
    Séances: snapshot.seances.length,
    Factures: snapshot.factures.length,
    Tags: snapshot.tags.length,
    "Modèles séances": snapshot.templates.length,
    Journal: audit.length
  }, exportedAt);

  addHumanPatients(wb, snapshot.patients);
  addHumanSeances(wb, snapshot.seances, patientsById);
  addHumanFactures(wb, snapshot.factures, patientsById);
  addHumanKpi(wb, kpi);
  addHumanTags(wb, snapshot.tags);
  addHumanTemplates(wb, snapshot.templates);
  addHumanAudit(wb, audit);

  // Remplit le Sommaire maintenant que tout est créé. Supprime le placeholder.
  wb.removeWorksheet(sommairePlaceholder.id);
  // Crée sommaire en début, on s'appuie sur le fait que ExcelJS insère à la fin ; on déplace via la propriété orderNo
  addHumanSommaire(
    wb,
    [
      { label: "Patients", emoji: "👥", description: "Liste complète des patients (actifs et inactifs)", rowCount: snapshot.patients.length },
      { label: "Séances", emoji: "📅", description: "Rendez-vous et séances avec statuts traduits", rowCount: snapshot.seances.length },
      { label: "Factures", emoji: "🧾", description: "Factures avec totaux HT/TTC", rowCount: snapshot.factures.length },
      { label: "KPI synthèse", emoji: "📊", description: "Indicateurs agrégés mois / année", rowCount: 9 },
      { label: "Tags", emoji: "🏷️", description: "Étiquettes transverses", rowCount: snapshot.tags.length },
      { label: "Modèles séances", emoji: "📝", description: "Modèles préconfigurés", rowCount: snapshot.templates.length },
      { label: "Journal", emoji: "📜", description: "500 dernières entrées du journal d'activité", rowCount: audit.length }
    ],
    {
      exportedAt,
      totalRows:
        snapshot.patients.length +
        snapshot.seances.length +
        snapshot.factures.length +
        snapshot.tags.length +
        snapshot.templates.length +
        audit.length
    }
  );
  // Met le Sommaire en premier onglet
  const sommaire = wb.getWorksheet("Sommaire");
  if (sommaire) {
    wb.worksheets.splice(wb.worksheets.indexOf(sommaire), 1);
    wb.worksheets.unshift(sommaire);
  }

  return wb;
}

export type HumanSnapshotResult = {
  filename: string;
  filePath: string;
  sizeBytes: number;
  counts: {
    patients: number;
    seances: number;
    factures: number;
    tags: number;
    templates: number;
  };
};

export async function writeHumanReadableSnapshot(targetDir?: string): Promise<HumanSnapshotResult> {
  const dir = targetDir ?? backupDir();
  await fs.mkdir(dir, { recursive: true });
  const stamp = ts();
  const filename = `psychhub-snapshot-${stamp}.xlsx`;
  const filePath = path.join(dir, filename);
  const wb = await buildHumanReadableSnapshot();
  await wb.xlsx.writeFile(filePath);
  const stat = await fs.stat(filePath);
  const counts = await prisma.$transaction([
    prisma.patient.count(),
    prisma.seance.count(),
    prisma.facture.count(),
    prisma.tag.count(),
    prisma.seanceTemplate.count()
  ]);
  return {
    filename,
    filePath,
    sizeBytes: stat.size,
    counts: {
      patients: counts[0],
      seances: counts[1],
      factures: counts[2],
      tags: counts[3],
      templates: counts[4]
    }
  };
}
