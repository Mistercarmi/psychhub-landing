import type ExcelJS from "exceljs";

export const STATUT_LABELS: Record<string, Record<string, string>> = {
  Seance: {
    PLANIFIEE: "Planifiée",
    HONOREE: "Honorée",
    ANNULEE_PATIENT: "Annulée (patient)",
    ANNULEE_PRATICIEN: "Annulée (praticien)",
    ABSENCE: "Absence"
  },
  Facture: {
    BROUILLON: "Brouillon",
    EMISE: "Émise",
    PAYEE: "Payée",
    EN_RETARD: "En retard",
    ANNULEE: "Annulée"
  }
};

export function localizeStatus(entity: "Seance" | "Facture", value: string): string {
  return STATUT_LABELS[entity]?.[value] ?? value;
}

export function formatCurrencyFr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

export function applyHumanReadableStyle(ws: ExcelJS.Worksheet): void {
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle", horizontal: "left" };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" }
  };
  header.height = 22;
  ws.columns.forEach((col) => {
    let max = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const v = cell.value;
      const len = v === null || v === undefined ? 0 : String(v).length;
      if (len > max) max = len;
    });
    col.width = Math.min(40, Math.max(12, max + 2));
  });
}

export type TotalsConfig = Record<string, "sum" | "count" | undefined>;

export function appendTotalsRow(
  ws: ExcelJS.Worksheet,
  totals: TotalsConfig,
  label = "Total"
): void {
  const lastRowIdx = ws.rowCount + 1;
  const cols = ws.columns ?? [];
  const values: Record<string, unknown> = {};
  // Premier intitulé en première colonne avec une clé
  const firstKey = cols[0]?.key as string | undefined;
  if (firstKey) values[firstKey] = label;

  for (const [key, kind] of Object.entries(totals)) {
    if (!kind) continue;
    const colIdx = cols.findIndex((c) => c.key === key);
    if (colIdx < 0) continue;
    const colLetter = ws.getColumn(colIdx + 1).letter;
    if (kind === "sum") {
      values[key] = { formula: `SUM(${colLetter}2:${colLetter}${lastRowIdx - 1})` };
    } else if (kind === "count") {
      values[key] = { formula: `COUNTA(${colLetter}2:${colLetter}${lastRowIdx - 1})` };
    }
  }
  const row = ws.addRow(values);
  row.font = { bold: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" }
  };
}

export function setNumberFormat(ws: ExcelJS.Worksheet, columnKey: string, format: string): void {
  const col = ws.getColumn(columnKey);
  if (!col) return;
  col.numFmt = format;
}

export const FORMAT_CURRENCY = '#,##0.00 "€"';
export const FORMAT_PERCENT = "0.00%";
export const FORMAT_DATE_FR = "dd/mm/yyyy";
export const FORMAT_DATETIME_FR = "dd/mm/yyyy hh:mm";
