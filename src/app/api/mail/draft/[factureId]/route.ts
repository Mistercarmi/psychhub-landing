import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { buildEml, renderTemplate } from "@/lib/outlook/eml-builder";
import { FactureDocument } from "@/lib/pdf/facture-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { factureId: string } }) {
  const [facture, config] = await Promise.all([
    prisma.facture.findUnique({
      where: { id: params.factureId },
      include: { patient: true, seances: { orderBy: { date: "asc" } } }
    }),
    prisma.config.findUnique({ where: { id: "default" } })
  ]);

  if (!facture) return new NextResponse("Not found", { status: 404 });
  if (!facture.patient.email) {
    return NextResponse.json(
      { error: "Le patient n'a pas d'email renseigné." },
      { status: 400 }
    );
  }

  const pdfBuffer = await renderToBuffer(
    FactureDocument({
      facture,
      patient: facture.patient,
      seances: facture.seances,
      config
    })
  );

  const isRelance = facture.statut === "EN_RETARD";
  const template = isRelance
    ? config?.templateMailRelance ?? "Bonjour {{prenom}},\n\nVotre facture n°{{numero}} reste en attente."
    : `Bonjour {{prenom}},\n\nVeuillez trouver ci-joint votre facture n°{{numero}} d'un montant de {{montant}} €.\n\nCordialement,\n{{praticien}}`;

  const body = renderTemplate(template, {
    prenom: facture.patient.prenom,
    nom: facture.patient.nom,
    numero: facture.numero,
    montant: facture.montantTTC.toFixed(2).replace(".", ","),
    praticien: config?.praticienNom ?? ""
  });

  const eml = buildEml({
    to: facture.patient.email,
    from: config?.email ?? undefined,
    subject: isRelance
      ? `Relance — Facture ${facture.numero}`
      : `Votre facture ${facture.numero}`,
    bodyText: body,
    attachment: {
      filename: `${facture.numero}.pdf`,
      contentBase64: Buffer.from(pdfBuffer).toString("base64")
    }
  });

  return new NextResponse(eml, {
    headers: {
      "Content-Type": "message/rfc822",
      "Content-Disposition": `attachment; filename="${facture.numero}.eml"`
    }
  });
}
