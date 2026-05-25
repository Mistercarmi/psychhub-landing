import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildIcs, type IcsEvent } from "@/lib/calendar/ics-builder";

export const dynamic = "force-dynamic";

/**
 * Flux iCal subscribable. Renvoie les séances futures + un mois en arrière par défaut.
 * URL d'abonnement à coller dans Outlook/Google/Apple Calendar.
 *
 * Paramètres :
 *   ?from=YYYY-MM-DD (défaut : J-30)
 *   ?to=YYYY-MM-DD   (défaut : J+365)
 *   ?status=PLANIFIEE,HONOREE (défaut : PLANIFIEE,HONOREE)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const now = new Date();
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const statusParam = url.searchParams.get("status");

  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : new Date(now.getTime() - 30 * 86_400_000);
  const to = toParam ? new Date(`${toParam}T23:59:59`) : new Date(now.getTime() + 365 * 86_400_000);
  const statuses =
    statusParam?.split(",").map((s) => s.trim()).filter(Boolean) ?? ["PLANIFIEE", "HONOREE"];

  const [seances, config] = await Promise.all([
    prisma.seance.findMany({
      where: { date: { gte: from, lte: to }, statut: { in: statuses } },
      orderBy: { date: "asc" },
      include: { patient: { select: { prenom: true, nom: true } } }
    }),
    prisma.config.findUnique({ where: { id: "default" } })
  ]);

  const events: IcsEvent[] = seances.map((s) => ({
    uid: `${s.id}@psychhub.local`,
    start: s.date,
    durationMinutes: s.dureeMinutes,
    summary: `Séance — ${s.patient.prenom} ${s.patient.nom}`,
    description: s.notesSeance ?? undefined,
    location: config?.adresse ?? undefined,
    status:
      s.statut === "HONOREE"
        ? "CONFIRMED"
        : s.statut === "PLANIFIEE"
          ? "CONFIRMED"
          : s.statut === "ANNULEE_PATIENT" || s.statut === "ANNULEE_PRATICIEN"
            ? "CANCELLED"
            : "TENTATIVE",
    lastModified: s.updatedAt
  }));

  const ics = buildIcs(events, {
    calName: config?.cabinetNom ? `PsychHub — ${config.cabinetNom}` : "PsychHub"
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="psychhub.ics"',
      "Cache-Control": "no-store"
    }
  });
}
