import { NextResponse } from "next/server";
import { buildBackupWorkbook } from "@/lib/backup/local-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const wb = await buildBackupWorkbook();
    const buf = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(buf as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="psychhub-${stamp}.xlsx"`
      }
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur export Excel" },
      { status: 500 }
    );
  }
}
