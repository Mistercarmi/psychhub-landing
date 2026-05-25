import { NextResponse, type NextRequest } from "next/server";
import { previewRestore, applyRestore } from "@/lib/google/sheets-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET = preview (diff)
export async function GET() {
  try {
    const result = await previewRestore();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}

// POST = apply (body = payload du preview)
export async function POST(req: NextRequest) {
  try {
    const { payload } = await req.json();
    const result = await applyRestore(payload);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
