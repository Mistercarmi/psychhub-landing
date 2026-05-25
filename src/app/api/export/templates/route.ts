import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { exportTemplateInputSchema } from "@/lib/validators/import-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.exportTemplate.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({
    rows: rows.map((r) => ({
      ...r,
      scope: JSON.parse(r.scope),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }))
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = exportTemplateInputSchema.parse(body);
    const tpl = await prisma.exportTemplate.upsert({
      where: { name: parsed.name },
      update: {
        description: parsed.description ?? null,
        format: parsed.format,
        scope: JSON.stringify(parsed.scope)
      },
      create: {
        name: parsed.name,
        description: parsed.description ?? null,
        format: parsed.format,
        scope: JSON.stringify(parsed.scope)
      }
    });
    return NextResponse.json({ ok: true, id: tpl.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
