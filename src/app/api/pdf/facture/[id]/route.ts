import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { FactureDocument } from "@/lib/pdf/facture-template";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const [facture, config] = await Promise.all([
    prisma.facture.findUnique({
      where: { id: params.id },
      include: { patient: true, seances: { orderBy: { date: "asc" } } }
    }),
    prisma.config.findUnique({ where: { id: "default" } })
  ]);

  if (!facture) return new NextResponse("Not found", { status: 404 });

  const buffer = await renderToBuffer(
    FactureDocument({
      facture,
      patient: facture.patient,
      seances: facture.seances,
      config
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${facture.numero}.pdf"`
    }
  });
}
