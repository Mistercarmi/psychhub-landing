import { sheets as sheetsApi } from "@googleapis/sheets";
import { drive as driveApi } from "@googleapis/drive";
import { getAuthedClient } from "@/lib/google/oauth";
import { composeExport } from "@/lib/export/compose-service";
import type { ExportScope } from "@/lib/validators/import-export";
import {
  AVAILABLE_COLUMNS
} from "@/lib/export/compose-service";

export type DriveExportResult = {
  spreadsheetId: string;
  url: string;
  counts: Record<string, number>;
  sizeBytes?: number;
};

/**
 * Crée un nouveau spreadsheet Google avec un onglet par table demandée.
 * Pour les formats != gsheets, on fait fallback en uploadant le fichier généré sur Drive (Drive API files.create).
 */
export async function exportComposedToDrive(scope: ExportScope): Promise<DriveExportResult> {
  const auth = await getAuthedClient();

  if (scope.format === "gsheets") {
    const sheets = sheetsApi({ version: "v4", auth });
    const title = `PsychHub Export — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    // Construit les valeurs par table à partir du compose-service (utilise XLSX en interne ; on peut directement lire depuis Prisma via composeExport JSON)
    const json = await composeExport({ ...scope, format: "json" });
    if (!json.buffer) throw new Error("Compose JSON failed");
    const data = JSON.parse(json.buffer.toString("utf8")).data as {
      patients?: Record<string, unknown>[];
      seances?: Record<string, unknown>[];
      factures?: Record<string, unknown>[];
      kpi?: Record<string, unknown>[];
    };

    const tabs: { name: string; rows: string[][] }[] = [];
    for (const t of scope.tables) {
      const cols = (scope.columns?.[t] && scope.columns[t]!.length > 0)
        ? AVAILABLE_COLUMNS[t].filter((c) => scope.columns![t]!.includes(c.key))
        : AVAILABLE_COLUMNS[t];
      const header = cols.map((c) => c.label);
      const rows: string[][] = [header];
      const src = (data[t] ?? []) as Record<string, unknown>[];
      for (const r of src) {
        rows.push(
          cols.map((c) => {
            let v: unknown = r[c.key];
            if (c.key === "patient") {
              const patient = r.patient as { nom?: string; prenom?: string } | undefined;
              v = patient ? `${patient.prenom ?? ""} ${patient.nom ?? ""}`.trim() : "";
            }
            if (v instanceof Date) return v.toISOString();
            if (v === null || v === undefined) return "";
            return String(v);
          })
        );
      }
      tabs.push({ name: tabName(t), rows });
    }

    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: tabs.map((t) => ({ properties: { title: t.name } }))
      }
    });
    const spreadsheetId = created.data.spreadsheetId!;
    for (const t of tabs) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${t.name}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: t.rows }
      });
    }
    return {
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      counts: json.counts
    };
  }

  // Pour xlsx / pdf / json / docx : on génère le buffer et on l'upload sur Drive
  const res = await composeExport(scope);
  if (!res.buffer) throw new Error("Buffer vide");
  const drive = driveApi({ version: "v3", auth: auth as unknown as Parameters<typeof driveApi>[0]["auth"] });
  const mime =
    res.format === "json"
      ? "application/json"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  // Drive media body attend un Readable stream
  const { Readable } = await import("node:stream");
  const file = await drive.files.create({
    requestBody: { name: res.filename, mimeType: mime },
    media: { mimeType: mime, body: Readable.from(res.buffer) },
    fields: "id, webViewLink"
  });
  return {
    spreadsheetId: file.data.id ?? "",
    url: file.data.webViewLink ?? `https://drive.google.com/file/d/${file.data.id}/view`,
    counts: res.counts,
    sizeBytes: res.sizeBytes
  };
}

function tabName(t: ExportScope["tables"][number]): string {
  if (t === "patients") return "Patients";
  if (t === "seances") return "Séances";
  if (t === "factures") return "Factures";
  if (t === "kpi") return "KPI";
  return t;
}
