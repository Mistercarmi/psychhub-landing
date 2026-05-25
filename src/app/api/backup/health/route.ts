import { NextResponse } from "next/server";
import { getBackupHealth } from "@/lib/backup/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getBackupHealth();
  return NextResponse.json(health);
}
