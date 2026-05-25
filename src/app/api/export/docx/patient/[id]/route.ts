import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { buildPatientDocx } from "@/lib/docx/patient-doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const p = await prisma.patient.findUnique({
    where: { id: params.id },
    include: { seances: { orderBy: { date: "desc" } }, factures: { orderBy: { dateEmission: "desc" } } }
  });
  if (!p) return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });

  const buf = await buildPatientDocx(p);
  const filename = `fiche-${p.nom}-${p.prenom}.docx`.replace(/\s+/g, "-").toLowerCase();
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
