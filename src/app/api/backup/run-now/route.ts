import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { runBackup } from "@/lib/backup/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  destinations: z.array(z.enum(["local", "drive", "external"])).min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destinations } = bodySchema.parse(body);
    const result = await runBackup({ destinations, triggeredBy: "manual" });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
