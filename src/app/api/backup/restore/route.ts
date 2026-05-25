import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { previewRestore, applyRestore } from "@/lib/google/sheets-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/backup/restore
 * Body : { backupLogId?: string, mode: "preview" | "apply" }
 * Restaure depuis :
 *  - le Google Sheet backup (BackupLog.type === "GSHEETS_SYNC")
 *  - un fichier JSON local (BackupLog.format === "xlsx+json" et même nom .json existe)
 * Pour MVP : on prend la dernière sauvegarde Google Sheets disponible.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { backupLogId?: string; mode: "preview" | "apply"; payload?: unknown };
    const mode = body.mode ?? "preview";

    if (body.backupLogId) {
      const log = await prisma.backupLog.findUnique({ where: { id: body.backupLogId } });
      if (!log) return NextResponse.json({ error: "Sauvegarde introuvable" }, { status: 404 });
      if (log.type !== "GSHEETS_SYNC") {
        return NextResponse.json({
          error: "Restauration automatique disponible uniquement depuis Google Sheets (les snapshots Excel servent à la lecture humaine)."
        }, { status: 400 });
      }
    }

    if (mode === "preview") {
      const diff = await previewRestore();
      return NextResponse.json(diff);
    } else {
      const payload = (body.payload ?? (await previewRestore()).payload) as Parameters<typeof applyRestore>[0];
      const result = await applyRestore(payload);
      return NextResponse.json(result);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
