import { sheets as sheetsApi, type sheets_v4 } from "@googleapis/sheets";
import { getAuthedClient } from "@/lib/google/oauth";

export type SpreadsheetSummary = {
  spreadsheetId: string;
  title: string;
  sheets: { sheetId: number; title: string; rowCount: number }[];
};

export type SheetData = {
  title: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

/**
 * Extrait l'ID d'un spreadsheet depuis une URL Google Sheets ou retourne tel quel si déjà ID.
 */
export function parseSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export async function getSpreadsheetSummary(spreadsheetId: string): Promise<SpreadsheetSummary> {
  const auth = await getAuthedClient();
  const sheets = sheetsApi({ version: "v4", auth });
  const res = await sheets.spreadsheets.get({ spreadsheetId, includeGridData: false });
  const title = res.data.properties?.title ?? "(sans titre)";
  const list = (res.data.sheets ?? []).map((s) => ({
    sheetId: s.properties?.sheetId ?? 0,
    title: s.properties?.title ?? "",
    rowCount: s.properties?.gridProperties?.rowCount ?? 0
  }));
  return { spreadsheetId, title, sheets: list };
}

async function readSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string
): Promise<SheetData> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${title}!A1:ZZ`
  });
  const values = res.data.values ?? [];
  if (values.length === 0) return { title, headers: [], rows: [] };
  const [headerRow, ...dataRows] = values;
  const headers = headerRow.map((h) => String(h ?? "").trim());
  const rows: Record<string, unknown>[] = dataRows
    .filter((r) => r.some((c) => c !== "" && c != null))
    .map((r) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        if (!h) return;
        obj[h] = r[i] ?? "";
      });
      return obj;
    });
  return { title, headers, rows };
}

export async function readSpreadsheet(spreadsheetId: string, sheetTitles?: string[]): Promise<SheetData[]> {
  const auth = await getAuthedClient();
  const sheets = sheetsApi({ version: "v4", auth });
  const summary = await getSpreadsheetSummary(spreadsheetId);
  const titles = sheetTitles && sheetTitles.length > 0 ? sheetTitles : summary.sheets.map((s) => s.title);
  const out: SheetData[] = [];
  for (const t of titles) {
    out.push(await readSheet(sheets, spreadsheetId, t));
  }
  return out;
}
