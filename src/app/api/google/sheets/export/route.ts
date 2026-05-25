import { NextResponse } from "next/server";
import { exportAllToSheet } from "@/lib/google/sheets-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await exportAllToSheet();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur d'export" },
      { status: 500 }
    );
  }
}
