import { NextResponse } from "next/server";
import { backupDir, listBackups, writeLocalBackup } from "@/lib/backup/local-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const files = await listBackups();
  return NextResponse.json({ dir: backupDir(), files });
}

export async function POST() {
  try {
    const result = await writeLocalBackup();
    return NextResponse.json({ ok: true, dir: backupDir(), ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur sauvegarde" },
      { status: 500 }
    );
  }
}
