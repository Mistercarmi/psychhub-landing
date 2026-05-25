import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderTemplate } from "@/lib/outlook/eml-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Renvoie le `{ subject, body, to, from }` qui sera utilisé pour générer le `.eml`.
 * Permet au front d'afficher un preview avant d'ouvrir le brouillon dans le client mail.
 */
export async function GET(_req: Request, { params }: { params: { factureId: string } }) {
  const [facture, config] = await Promise.all([
    prisma.facture.findUnique({
      where: { id: params.factureId },
      include: { patient: true }
    }),
    prisma.config.findUnique({ where: { id: "default" } })
  ]);

  if (!facture) return new NextResponse("Not found", { status: 404 });
  if (!facture.patient.email) {
    return NextResponse.json({ error: "Le patient n'a pas d'email renseigné." }, { status: 400 });
  }

  const isRelance = facture.statut === "EN_RETARD";
  const template = isRelance
    ? config?.templateMailRelance ??
      "Bonjour {{prenom}},\n\nVotre facture n°{{numero}} reste en attente."
    : `Bonjour {{prenom}},\n\nVeuillez trouver ci-joint votre facture n°{{numero}} d'un montant de {{montant}} €.\n\nCordialement,\n{{praticien}}`;

  const body = renderTemplate(template, {
    prenom: facture.patient.prenom,
    nom: facture.patient.nom,
    numero: facture.numero,
    montant: facture.montantTTC.toFixed(2).replace(".", ","),
    praticien: config?.praticienNom ?? ""
  });

  return NextResponse.json({
    to: facture.patient.email,
    from: config?.email ?? null,
    subject: isRelance
      ? `Relance — Facture ${facture.numero}`
      : `Votre facture ${facture.numero}`,
    body,
    isRelance
  });
}
