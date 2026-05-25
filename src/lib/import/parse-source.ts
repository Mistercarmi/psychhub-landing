import ExcelJS from "exceljs";
import Papa from "papaparse";

export type ParsedSheet = {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

function cellToValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null) {
    const v = value as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (v.richText && Array.isArray(v.richText)) return v.richText.map((rt) => rt.text).join("");
    if (v.result !== undefined) return v.result;
    if (v.text !== undefined) return v.text;
  }
  return value;
}

/** Parse un fichier XLSX/XLSM. */
export async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<ParsedSheet[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const out: ParsedSheet[] = [];
  wb.worksheets.forEach((ws) => {
    const headersRow = ws.getRow(1);
    const headers: string[] = [];
    headersRow.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = String(cellToValue(cell.value) ?? "").trim();
    });
    if (headers.every((h) => !h)) return;

    const rows: Record<string, unknown>[] = [];
    ws.eachRow({ includeEmpty: false }, (row, idx) => {
      if (idx === 1) return;
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        if (!h) return;
        const cell = row.getCell(i + 1);
        obj[h] = cellToValue(cell.value);
      });
      if (Object.values(obj).some((v) => v !== null && v !== "")) rows.push(obj);
    });
    out.push({ name: ws.name, headers: headers.filter(Boolean), rows });
  });
  return out;
}

/** Parse un fichier CSV (auto headers). */
export function parseCsvText(text: string, name = "CSV"): ParsedSheet {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  });
  const headers = result.meta.fields ?? [];
  return { name, headers, rows: result.data as Record<string, unknown>[] };
}

/** Auto-détecte XLSX vs CSV à partir du nom de fichier. */
export async function parseFile(file: File): Promise<ParsedSheet[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    return [parseCsvText(text, file.name.replace(/\.csv$/i, ""))];
  }
  const buf = await file.arrayBuffer();
  return parseXlsxBuffer(buf);
}
