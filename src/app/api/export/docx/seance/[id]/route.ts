import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { buildSeanceDocx } from "@/lib/docx/patient-doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = await prisma.seance.findUnique({
    where: { id: params.id },
    include: { patient: true }
  });
  if (!s) return NextResponse.json({ error: "Séance introuvable" }, { status: 404 });

  const buf = await buildSeanceDocx(s);
  const filename = `seance-${s.patient.nom}-${new Date(s.date).toISOString().slice(0, 10)}.docx`
    .replace(/\s+/g, "-")
    .toLowerCase();
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
