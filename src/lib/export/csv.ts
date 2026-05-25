/**
 * Helpers d'export CSV — utilise `papaparse` (déjà en deps) pour le bon échappement.
 */
import Papa from "papaparse";

export interface CsvField<T> {
  key: string;
  header?: string;
  value: (row: T) => string | number | null | undefined;
}

export function rowsToCsv<T>(rows: T[], fields: CsvField<T>[]): string {
  const headers = fields.map((f) => f.header ?? f.key);
  const data = rows.map((r) =>
    Object.fromEntries(
      fields.map((f) => {
        const raw = f.value(r);
        return [f.header ?? f.key, raw ?? ""];
      })
    )
  );
  // BOM UTF-8 pour Excel
  return "﻿" + Papa.unparse({ fields: headers, data }, { delimiter: ";" });
}

/** Déclenche le téléchargement d'un blob CSV côté client. */
export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
