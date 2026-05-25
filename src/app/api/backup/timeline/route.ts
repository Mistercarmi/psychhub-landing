import { NextResponse, type NextRequest } from "next/server";
import { getTimeline } from "@/lib/backup/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(500, Math.max(10, Number(url.searchParams.get("limit") ?? 100)));
  const entries = await getTimeline(limit);
  return NextResponse.json({ entries });
}
