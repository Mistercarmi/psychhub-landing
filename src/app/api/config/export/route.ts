import { NextResponse } from "next/server";
import { exportConfigJson } from "@/server/config.actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const json = await exportConfigJson();
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="psychhub-config-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`
    }
  });
}
