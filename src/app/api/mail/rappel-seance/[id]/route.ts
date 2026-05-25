import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildEml, renderTemplate } from "@/lib/outlook/eml-builder";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const DEFAULT_TEMPLATE = `Bonjour {{prenom}},

Je vous rappelle votre rendez-vous prévu le {{date}} à {{heure}}.
Durée prévue : {{duree}} minutes.

Si vous ne pouvez pas honorer ce rendez-vous, merci de me prévenir au plus tôt.

Cordialement,
{{praticien}}`;

/**
 * Génère un brouillon .eml de rappel de séance pour le patient indiqué.
 * L'utilisateur ouvre le fichier dans son client mail et valide l'envoi.
 */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const seance = await prisma.seance.findUnique({
    where: { id: params.id },
    include: { patient: true }
  });
  if (!seance) {
    return NextResponse.json({ error: "Séance introuvable" }, { status: 404 });
  }
  if (!seance.patient.email) {
    return NextResponse.json(
      { error: "Le patient n'a pas d'adresse email enregistrée" },
      { status: 400 }
    );
  }

  const config = await prisma.config.findUnique({ where: { id: "default" } });
  if (!config?.rappelsActifs) {
    return NextResponse.json(
      { error: "Les rappels automatiques sont désactivés dans les paramètres" },
      { status: 403 }
    );
  }
  const template = config.templateMailRappelSeance?.trim() || DEFAULT_TEMPLATE;

  const dateFr = seance.date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const heure = seance.date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const body = renderTemplate(template, {
    prenom: seance.patient.prenom,
    nom: seance.patient.nom,
    date: dateFr,
    heure,
    duree: seance.dureeMinutes,
    praticien: config?.praticienNom ?? config?.cabinetNom ?? ""
  });

  const subject = `Rappel — Rendez-vous du ${dateFr}`;

  const eml = buildEml({
    to: seance.patient.email,
    from: config?.email ?? "",
    subject,
    bodyText: body
  });

  // Trace l'accès à l'email patient (RGPD).
  await audit({
    entityType: "Seance",
    entityId: seance.id,
    action: "READ_SENSITIVE",
    after: { context: "rappel_seance_eml", patientId: seance.patient.id }
  });

  return new NextResponse(eml, {
    status: 200,
    headers: {
      "Content-Type": "message/rfc822; charset=utf-8",
      "Content-Disposition": `attachment; filename="rappel-${seance.id}.eml"`
    }
  });
}
