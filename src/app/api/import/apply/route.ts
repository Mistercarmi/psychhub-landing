import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { applyImport, type ApplySheet } from "@/lib/import/apply-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApplyRequest = {
  importLogId: string;
  sheets: ApplySheet[];
};

export async function POST(req: NextRequest) {
  let importLogId: string | null = null;
  const started = Date.now();
  try {
    const body = (await req.json()) as ApplyRequest;
    importLogId = body.importLogId;
    if (!importLogId) return NextResponse.json({ error: "importLogId requis" }, { status: 400 });
    if (!Array.isArray(body.sheets)) return NextResponse.json({ error: "sheets[] requis" }, { status: 400 });

    const result = await applyImport(body.sheets);

    await prisma.importLog.update({
      where: { id: importLogId },
      data: {
        status: result.errors.length > 0 ? "FAILED" : "APPLIED",
        patientsCreated: result.patientsCreated,
        patientsUpdated: result.patientsUpdated,
        seancesCreated: result.seancesCreated,
        seancesUpdated: result.seancesUpdated,
        facturesCreated: result.facturesCreated,
        facturesUpdated: result.facturesUpdated,
        conflictsResolved: result.conflictsResolved,
        rowsSkipped: result.rowsSkipped,
        errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
        durationMs: Date.now() - started
      }
    });

    revalidatePath("/patients");
    revalidatePath("/seances");
    revalidatePath("/factures");
    revalidatePath("/dashboard");

    return NextResponse.json({ ok: result.errors.length === 0, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur d'import";
    if (importLogId) {
      await prisma.importLog
        .update({
          where: { id: importLogId },
          data: {
            status: "FAILED",
            errors: JSON.stringify([message]),
            durationMs: Date.now() - started
          }
        })
        .catch(() => undefined);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
