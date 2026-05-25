import fs from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { resolveBackupFile } from "@/lib/backup/local-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  const filePath = resolveBackupFile(params.filename);
  if (!filePath) {
    return NextResponse.json({ error: "Nom de fichier invalide" }, { status: 400 });
  }
  try {
    const buf = await fs.readFile(filePath);
    const isXlsx = params.filename.endsWith(".xlsx");
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": isXlsx
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/json",
        "Content-Disposition": `attachment; filename="${params.filename}"`
      }
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { filename: string } }) {
  const filePath = resolveBackupFile(params.filename);
  if (!filePath) {
    return NextResponse.json({ error: "Nom de fichier invalide" }, { status: 400 });
  }
  try {
    await fs.unlink(filePath);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
  }
}
