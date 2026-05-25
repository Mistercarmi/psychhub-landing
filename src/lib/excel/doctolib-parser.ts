import ExcelJS from "exceljs";

export type DoctolibRow = {
  doctolibRef: string;
  date: Date;
  patientNom: string;
  patientPrenom: string;
  patientEmail?: string | null;
  dureeMinutes: number;
  statut: string;
};

export interface DoctolibParseError {
  rowNumber: number;
  field?: string;
  reason: string;
  raw?: Record<string, unknown>;
}

export interface DoctolibParseResult {
  rows: DoctolibRow[];
  errors: DoctolibParseError[];
  /** Nombre de lignes ignorées (vides ou patient manquant). */
  skipped: number;
  /** En-têtes détectées (debug). */
  headers: string[];
  /** Indices des colonnes détectées (-1 = absente). */
  detectedColumns: {
    date: number;
    nom: number;
    prenom: number;
    email: number;
    statut: number;
    duree: number;
    ref: number;
  };
}

const STATUT_MAP: Record<string, string> = {
  // PLANIFIEE
  confirme: "PLANIFIEE",
  confirmee: "PLANIFIEE",
  planifie: "PLANIFIEE",
  planifiee: "PLANIFIEE",
  "a venir": "PLANIFIEE",
  scheduled: "PLANIFIEE",
  // HONOREE
  honore: "HONOREE",
  honoree: "HONOREE",
  realisee: "HONOREE",
  realise: "HONOREE",
  termine: "HONOREE",
  terminee: "HONOREE",
  completed: "HONOREE",
  done: "HONOREE",
  // ANNULEE_PATIENT
  annule: "ANNULEE_PATIENT",
  annulee: "ANNULEE_PATIENT",
  "annule par le patient": "ANNULEE_PATIENT",
  "annulee par le patient": "ANNULEE_PATIENT",
  cancelled: "ANNULEE_PATIENT",
  canceled: "ANNULEE_PATIENT",
  // ANNULEE_PRATICIEN
  "annule par le praticien": "ANNULEE_PRATICIEN",
  "annulee par le praticien": "ANNULEE_PRATICIEN",
  "annule par praticien": "ANNULEE_PRATICIEN",
  // ABSENCE
  absent: "ABSENCE",
  absente: "ABSENCE",
  absence: "ABSENCE",
  "non honore": "ABSENCE",
  "non honoree": "ABSENCE",
  "no-show": "ABSENCE",
  noshow: "ABSENCE"
};

/** Normalise une chaîne : minuscules, sans accents, espaces collapsés. */
export function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeStatut(raw: string): string {
  const k = normalizeKey(raw);
  if (STATUT_MAP[k]) return STATUT_MAP[k];
  // Heuristique défensive : si le mot contient "annul" → annulation patient par défaut.
  if (k.includes("annul")) return "ANNULEE_PATIENT";
  if (k.includes("absent") || k.includes("absence") || k.includes("show")) return "ABSENCE";
  if (k.includes("honor") || k.includes("realis") || k.includes("termin")) return "HONOREE";
  return "PLANIFIEE";
}

/**
 * Détection de colonne tolérante :
 * 1. égalité exacte (normalisée) sur l'un des candidats
 * 2. début par un candidat
 * 3. contient un candidat
 */
export function pickCol(headers: string[], candidates: string[]): number {
  const norm = headers.map((h) => normalizeKey(h ?? ""));
  const cands = candidates.map(normalizeKey);

  for (const c of cands) {
    const i = norm.findIndex((h) => h === c);
    if (i >= 0) return i;
  }
  for (const c of cands) {
    const i = norm.findIndex((h) => h.startsWith(c));
    if (i >= 0) return i;
  }
  for (const c of cands) {
    const i = norm.findIndex((h) => h.includes(c));
    if (i >= 0) return i;
  }
  return -1;
}

export function parseDateValue(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    // Numero série Excel → Date (epoch 1899-12-30)
    const ms = (value - 25569) * 86_400_000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // dd/mm/yyyy [hh:mm]
    const fr = trimmed.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (fr) {
      const year = Number(fr[3].length === 2 ? `20${fr[3]}` : fr[3]);
      const d = new Date(
        year,
        Number(fr[2]) - 1,
        Number(fr[1]),
        Number(fr[4] ?? 0),
        Number(fr[5] ?? 0),
        Number(fr[6] ?? 0)
      );
      if (!Number.isNaN(d.getTime())) return d;
    }
    // ISO fallback
    const iso = new Date(trimmed);
    if (!Number.isNaN(iso.getTime())) return iso;
  }
  return null;
}

/**
 * Parser robuste pour les exports Doctolib (XLSX).
 * Détecte les colonnes par nom (insensible aux accents/casse, multi-stratégies).
 * Retourne lignes valides + erreurs détaillées + indices colonnes (debug).
 */
export async function parseDoctolibXlsxDetailed(buffer: ArrayBuffer): Promise<DoctolibParseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  const errors: DoctolibParseError[] = [];
  if (!ws) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, reason: "Aucune feuille trouvée dans le classeur" }],
      skipped: 0,
      headers: [],
      detectedColumns: { date: -1, nom: -1, prenom: -1, email: -1, statut: -1, duree: -1, ref: -1 }
    };
  }

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? "").trim();
  });

  const detectedColumns = {
    date: pickCol(headers, ["date", "date rdv", "date du rdv", "rendez vous", "rdv"]),
    nom: pickCol(headers, ["nom", "nom patient", "lastname", "last name"]),
    prenom: pickCol(headers, ["prenom", "prenom patient", "firstname", "first name"]),
    email: pickCol(headers, ["email", "mail", "e mail", "courriel"]),
    statut: pickCol(headers, ["statut", "status", "etat", "etat rdv"]),
    duree: pickCol(headers, ["duree", "duration", "duree min"]),
    ref: pickCol(headers, ["ref", "reference", "id rdv", "id"])
  };

  const rows: DoctolibRow[] = [];
  let skipped = 0;

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const cellVal = (col: number) =>
      col >= 0 ? row.getCell(col + 1).value : undefined;
    const cellStr = (col: number) => {
      const v = cellVal(col);
      return v === null || v === undefined ? "" : String(v).trim();
    };

    const nom = cellStr(detectedColumns.nom);
    const prenom = cellStr(detectedColumns.prenom);
    if (!nom && !prenom) {
      skipped++;
      return;
    }
    if (!nom) {
      errors.push({ rowNumber, field: "nom", reason: "Nom manquant" });
      return;
    }

    const date = parseDateValue(cellVal(detectedColumns.date));
    if (!date) {
      errors.push({
        rowNumber,
        field: "date",
        reason: "Date invalide ou manquante",
        raw: { value: cellVal(detectedColumns.date) }
      });
      return;
    }

    const refRaw = cellStr(detectedColumns.ref);
    const doctolibRef =
      refRaw || `${date.toISOString()}_${nom.toLowerCase()}_${prenom.toLowerCase()}`;

    const emailRaw = cellStr(detectedColumns.email);
    const dureeRaw = cellVal(detectedColumns.duree);
    let duree = 50;
    if (dureeRaw !== undefined && dureeRaw !== null && dureeRaw !== "") {
      const n = Number(dureeRaw);
      if (Number.isFinite(n) && n > 0) duree = Math.round(n);
      else errors.push({ rowNumber, field: "duree", reason: `Durée invalide, défaut 50`, raw: { value: dureeRaw } });
    }

    rows.push({
      doctolibRef,
      date,
      patientNom: nom,
      patientPrenom: prenom,
      patientEmail: emailRaw || null,
      dureeMinutes: duree,
      statut: normalizeStatut(cellStr(detectedColumns.statut))
    });
  });

  return { rows, errors, skipped, headers, detectedColumns };
}

/**
 * Rétro-compatibilité : ne renvoie que les lignes valides (les erreurs sont silencieusement ignorées).
 * Préférer `parseDoctolibXlsxDetailed` pour journaliser les erreurs côté UI/ImportLog.
 */
export async function parseDoctolibXlsx(buffer: ArrayBuffer): Promise<DoctolibRow[]> {
  const { rows } = await parseDoctolibXlsxDetailed(buffer);
  return rows;
}
