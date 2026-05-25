import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { PatientDossierDocument } from "@/lib/pdf/patient-dossier-template";
import { prisma } from "@/lib/db";
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

  const config = await prisma.config.findUnique({ where: { id: "default" } });

  // Trace la lecture du dossier complet comme un accès sensible (RGPD)
  await audit({
    entityType: "Patient",
    entityId: patient.id,
    action: "READ_SENSITIVE",
    before: { context: "pdf-dossier-export" }
  });

  const buffer = await renderToBuffer(
    PatientDossierDocument({
      patient,
      seances: patient.seances,
      factures: patient.factures,
      config
    })
  );

  const safeName = `${patient.nom}_${patient.prenom}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="dossier-${safeName}.pdf"`
    }
  });
}
