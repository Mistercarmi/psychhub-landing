import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildPatientDocx } from "@/lib/docx/patient-doc";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      seances: { orderBy: { date: "desc" } },
      factures: { orderBy: { dateEmission: "desc" } }
    }
  });
  if (!patient) return new NextResponse("Not found", { status: 404 });

  // Trace la lecture du dossier complet comme un accès sensible (RGPD)
  await audit({
    entityType: "Patient",
    entityId: patient.id,
    action: "READ_SENSITIVE",
    before: { context: "docx-dossier-export" }
  });

  const buffer = await buildPatientDocx(patient);

  const safeName = `${patient.nom}_${patient.prenom}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="dossier-${safeName}.docx"`
    }
  });
}
