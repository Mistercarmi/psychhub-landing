import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { parseFile } from "@/lib/import/parse-source";
import { summarizeSheet, pickBestType, type SheetSummary } from "@/lib/import/detect-type";
import { parseSpreadsheetId, readSpreadsheet, getSpreadsheetSummary } from "@/lib/google/sheets-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnalyzeResponse = {
  importLogId: string;
  source: "doctolib" | "excel" | "csv" | "gsheets";
  filename?: string;
  spreadsheetTitle?: string;
  sheets: SheetSummary[];
  bestType: string;
  bestConfidence: number;
};

function detectSourceFromFile(name: string): "doctolib" | "excel" | "csv" {
  const n = name.toLowerCase();
  if (n.includes("doctolib")) return "doctolib";
  if (n.endsWith(".csv")) return "csv";
  return "excel";
}

export async function POST(req: NextRequest): Promise<NextResponse<AnalyzeResponse | { error: string }>> {
  try {
    const ct = req.headers.get("content-type") ?? "";

    if (ct.includes("application/json")) {
      // Source Google Sheets : body = { spreadsheetUrl?: string, spreadsheetId?: string, sheetTitles?: string[] }
      const body = (await req.json()) as { spreadsheetUrl?: string; spreadsheetId?: string; sheetTitles?: string[] };
      const id = body.spreadsheetId ?? parseSpreadsheetId(body.spreadsheetUrl ?? "");
      if (!id) return NextResponse.json({ error: "Identifiant ou URL Google Sheets invalide." }, { status: 400 });
      const summary = await getSpreadsheetSummary(id);
      const data = await readSpreadsheet(id, body.sheetTitles);
      const summaries = data.map((d) => summarizeSheet(d.title, d.headers, d.rows));
      const best = pickBestType(summaries);
      const log = await prisma.importLog.create({
        data: {
          source: "gsheets",
          filename: summary.title,
          detectedType: best.type,
          status: "PREVIEW",
          mapping: JSON.stringify({ spreadsheetId: id, summaries: summaries.map((s) => ({ name: s.name, mapping: s.suggestedMapping })) })
        }
      });
      return NextResponse.json({
        importLogId: log.id,
        source: "gsheets",
        spreadsheetTitle: summary.title,
        sheets: summaries,
        bestType: best.type,
        bestConfidence: best.confidence
      });
    }

    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
    }

    const parsed = await parseFile(file);
    const summaries = parsed.map((p) => summarizeSheet(p.name, p.headers, p.rows));
    const best = pickBestType(summaries);
    const source = detectSourceFromFile(file.name);
    const log = await prisma.importLog.create({
      data: {
        source,
        filename: file.name,
        detectedType: best.type,
        status: "PREVIEW",
        mapping: JSON.stringify({ summaries: summaries.map((s) => ({ name: s.name, mapping: s.suggestedMapping })) })
      }
    });

    return NextResponse.json({
      importLogId: log.id,
      source,
      filename: file.name,
      sheets: summaries,
      bestType: best.type,
      bestConfidence: best.confidence
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur d'analyse" },
      { status: 500 }
    );
  }
}
