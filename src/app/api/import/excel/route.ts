import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SheetRow = Record<string, unknown>;

const LABEL_TO_KEY: Record<string, Record<string, string>> = {
  Patients: {
    "ID": "id",
    "Nom": "nom",
    "Prénom": "prenom",
    "Date de naissance": "dateNaissance",
    "Email": "email",
    "Téléphone": "telephone",
    "Adresse": "adresse",
    "N° Sécurité Sociale": "numeroSecu",
    "Motif de consultation": "motifConsult",
    "Notes cliniques": "notesCliniques",
    "Actif": "actif"
  },
  Séances: {
    "ID": "id",
    "ID Patient": "patientId",
    "Date": "date",
    "Durée (min)": "dureeMinutes",
    "Tarif (€)": "tarif",
    "Statut": "statut",
    "Source import": "sourceImport",
    "Réf Doctolib": "doctolibRef",
    "Notes de séance": "notesSeance",
    "ID Facture": "factureId"
  },
  Factures: {
    "ID": "id",
    "Numéro": "numero",
    "ID Patient": "patientId",
    "Date émission": "dateEmission",
    "Date échéance": "dateEcheance",
    "Montant HT (€)": "montantHT",
    "Montant TTC (€)": "montantTTC",
    "TVA (%)": "tva",
    "Statut": "statut",
    "Date paiement": "datePaiement",
    "Mode paiement": "modePaiement",
    "Notes": "notes"
  }
};

const DATE_FIELDS = new Set([
  "dateNaissance",
  "date",
  "dateEmission",
  "dateEcheance",
  "datePaiement"
]);
const NUMBER_FIELDS = new Set(["dureeMinutes", "tarif", "montantHT", "montantTTC", "tva"]);

function coerce(field: string, value: unknown): unknown {
  if (value === null || value === undefined || value === "") return null;
  if (DATE_FIELDS.has(field)) {
    if (value instanceof Date) return value;
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (NUMBER_FIELDS.has(field)) return Number(value);
  if (field === "actif") {
    const v = String(value).toLowerCase();
    return v === "true" || v === "1" || v === "oui";
  }
  return String(value);
}

function mapHeaders(sheetName: string, headers: string[]): string[] {
  const labelMap = LABEL_TO_KEY[sheetName] ?? {};
  return headers.map((h) => labelMap[h] ?? h);
}

async function parseXlsx(buf: ArrayBuffer): Promise<Record<string, SheetRow[]>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const out: Record<string, SheetRow[]> = {};
  for (const ws of wb.worksheets) {
    const rows: SheetRow[] = [];
    const headerRow = ws.getRow(1).values as unknown[];
    const headers = (headerRow ?? []).slice(1).map((v) => String(v ?? ""));
    const keys = mapHeaders(ws.name, headers);
    ws.eachRow({ includeEmpty: false }, (row, idx) => {
      if (idx === 1) return;
      const values = row.values as unknown[];
      const obj: SheetRow = {};
      keys.forEach((k, i) => {
        obj[k] = values[i + 1] ?? null;
      });
      rows.push(obj);
    });
    out[ws.name] = rows;
  }
  return out;
}

function parseCsv(text: string): Record<string, SheetRow[]> {
  const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
  return { Patients: result.data as SheetRow[] };
}

type Diff = { creates: number; updates: number; unchanged: number };

async function diffPatients(rows: SheetRow[]): Promise<Diff> {
  const existing = new Set((await prisma.patient.findMany({ select: { id: true } })).map((p) => p.id));
  let creates = 0;
  let updates = 0;
  for (const r of rows) {
    const id = r.id ? String(r.id) : null;
    if (id && existing.has(id)) updates++;
    else creates++;
  }
  return { creates, updates, unchanged: 0 };
}

async function diffSeances(rows: SheetRow[]): Promise<Diff> {
  const existing = new Set((await prisma.seance.findMany({ select: { id: true } })).map((s) => s.id));
  let creates = 0;
  let updates = 0;
  for (const r of rows) {
    const id = r.id ? String(r.id) : null;
    if (id && existing.has(id)) updates++;
    else creates++;
  }
  return { creates, updates, unchanged: 0 };
}

async function diffFactures(rows: SheetRow[]): Promise<Diff> {
  const existing = new Set((await prisma.facture.findMany({ select: { id: true } })).map((f) => f.id));
  let creates = 0;
  let updates = 0;
  for (const r of rows) {
    const id = r.id ? String(r.id) : null;
    if (id && existing.has(id)) updates++;
    else creates++;
  }
  return { creates, updates, unchanged: 0 };
}

function pickFields(r: SheetRow, fields: string[]) {
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f] = coerce(f, r[f]);
  return out;
}

async function applyPatients(rows: SheetRow[]) {
  const fields = [
    "nom",
    "prenom",
    "dateNaissance",
    "email",
    "telephone",
    "adresse",
    "numeroSecu",
    "motifConsult",
    "notesCliniques",
    "actif"
  ];
  let creates = 0;
  let updates = 0;
  for (const r of rows) {
    if (!r.nom && !r.prenom) continue;
    const data = pickFields(r, fields);
    const id = r.id ? String(r.id) : null;
    if (id) {
      await prisma.patient.upsert({
        where: { id },
        update: data as never,
        create: { id, ...(data as Record<string, unknown>) } as never
      });
      updates++;
    } else {
      await prisma.patient.create({ data: data as never });
      creates++;
    }
  }
  return { creates, updates };
}

async function applySeances(rows: SheetRow[]) {
  const fields = [
    "patientId",
    "date",
    "dureeMinutes",
    "tarif",
    "statut",
    "sourceImport",
    "doctolibRef",
    "notesSeance",
    "factureId"
  ];
  let creates = 0;
  let updates = 0;
  for (const r of rows) {
    if (!r.patientId || !r.date) continue;
    const data = pickFields(r, fields);
    const id = r.id ? String(r.id) : null;
    if (id) {
      await prisma.seance.upsert({
        where: { id },
        update: data as never,
        create: { id, ...(data as Record<string, unknown>) } as never
      });
      updates++;
    } else {
      await prisma.seance.create({ data: data as never });
      creates++;
    }
  }
  return { creates, updates };
}

async function applyFactures(rows: SheetRow[]) {
  const fields = [
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
    "notes"
  ];
  let creates = 0;
  let updates = 0;
  for (const r of rows) {
    if (!r.numero || !r.patientId) continue;
    const data = pickFields(r, fields);
    const id = r.id ? String(r.id) : null;
    if (id) {
      await prisma.facture.upsert({
        where: { id },
        update: data as never,
        create: { id, ...(data as Record<string, unknown>) } as never
      });
      updates++;
    } else {
      await prisma.facture.create({ data: data as never });
      creates++;
    }
  }
  return { creates, updates };
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    const apply = fd.get("apply") === "true";
    if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

    const buf = await file.arrayBuffer();
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const sheets = isCsv ? parseCsv(new TextDecoder().decode(buf)) : await parseXlsx(buf);

    const patients = sheets["Patients"] ?? [];
    const seances = sheets["Séances"] ?? sheets["Seances"] ?? [];
    const factures = sheets["Factures"] ?? [];

    const diff = {
      Patients: await diffPatients(patients),
      Séances: await diffSeances(seances),
      Factures: await diffFactures(factures)
    };

    if (!apply) {
      return NextResponse.json({
        preview: true,
        diff,
        sample: {
          Patients: patients.slice(0, 10),
          Séances: seances.slice(0, 10),
          Factures: factures.slice(0, 10)
        }
      });
    }

    const pRes = await applyPatients(patients);
    const sRes = await applySeances(seances);
    const fRes = await applyFactures(factures);

    return NextResponse.json({ ok: true, patients: pRes, seances: sRes, factures: fRes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur import" },
      { status: 500 }
    );
  }
}
