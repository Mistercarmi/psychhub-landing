import { NextResponse, type NextRequest } from "next/server";
import { parseDoctolibXlsx } from "@/lib/excel/doctolib-parser";
import { prisma } from "@/lib/db";
import { importDoctolibSeances } from "@/server/seances.actions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const apply = form.get("apply") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const rows = await parseDoctolibXlsx(buffer);

  if (!apply) {
    // Mode preview : on retourne juste les lignes parsées
    return NextResponse.json({ preview: true, count: rows.length, rows: rows.slice(0, 100) });
  }

  const config = await prisma.config.findUnique({ where: { id: "default" } });
  const tarifDefaut = config?.tarifDefaut ?? 60;

  const result = await importDoctolibSeances(rows, tarifDefaut);
  return NextResponse.json({ preview: false, ...result, total: rows.length });
}
