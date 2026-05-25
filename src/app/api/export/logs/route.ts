import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? 20)));

  const [total, rows] = await Promise.all([
    prisma.exportLog.count(),
    prisma.exportLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { template: { select: { name: true } } }
    })
  ]);

  return NextResponse.json({
    rows: rows.map((r) => ({
      ...r,
      scope: JSON.parse(r.scope),
      rowCounts: JSON.parse(r.rowCounts),
      createdAt: r.createdAt.toISOString()
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  });
}
