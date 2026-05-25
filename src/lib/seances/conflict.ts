/**
 * Détection de conflits de planification (double-booking).
 *
 * Une séance occupe `[date, date + dureeMinutes)`.
 * Deux séances sont en conflit si leurs intervalles se chevauchent strictement.
 *
 * Seules les séances avec statut `PLANIFIEE` ou `HONOREE` sont considérées comme
 * "occupant le créneau". Les annulations et absences libèrent le créneau.
 */
import { prisma } from "@/lib/db";

const BLOCKING_STATUTS = new Set(["PLANIFIEE", "HONOREE"]);

export interface ConflictInput {
  date: Date;
  dureeMinutes: number;
  /** ID de séance à exclure (utile pour update/reschedule). */
  excludeId?: string;
  /** Si fourni, restreint la recherche à un patient (cas rare, ex: trouver doublons même patient). */
  patientId?: string;
}

export interface ConflictHit {
  id: string;
  date: Date;
  dureeMinutes: number;
  patientId: string;
  patientLabel?: string;
}

/**
 * Vérifie si deux intervalles `[aStart, aEnd)` et `[bStart, bEnd)` se chevauchent.
 * Pur, sans dépendance Prisma. Exporté pour les tests.
 */
export function intervalsOverlap(
  aStart: Date,
  aDurationMin: number,
  bStart: Date,
  bDurationMin: number
): boolean {
  const aEnd = new Date(aStart.getTime() + aDurationMin * 60_000);
  const bEnd = new Date(bStart.getTime() + bDurationMin * 60_000);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Renvoie la liste des séances en conflit avec le créneau demandé.
 * Tableau vide = pas de conflit.
 */
export async function detectConflicts(input: ConflictInput): Promise<ConflictHit[]> {
  const start = input.date;
  const end = new Date(start.getTime() + input.dureeMinutes * 60_000);

  // Pré-filtrage SQL : on charge toutes les séances qui *pourraient* chevaucher.
  // Une séance dont la date est dans `[start - 4h, end]` peut potentiellement se chevaucher
  // si sa durée est >= au gap. On prend une marge confortable de 8h.
  const windowFrom = new Date(start.getTime() - 8 * 60 * 60_000);
  const windowTo = end;

  const candidates = await prisma.seance.findMany({
    where: {
      ...(input.excludeId ? { NOT: { id: input.excludeId } } : {}),
      ...(input.patientId ? { patientId: input.patientId } : {}),
      date: { gte: windowFrom, lte: windowTo },
      statut: { in: Array.from(BLOCKING_STATUTS) }
    },
    select: {
      id: true,
      date: true,
      dureeMinutes: true,
      patientId: true,
      patient: { select: { prenom: true, nom: true } }
    }
  });

  const hits: ConflictHit[] = [];
  for (const c of candidates) {
    if (intervalsOverlap(start, input.dureeMinutes, c.date, c.dureeMinutes)) {
      hits.push({
        id: c.id,
        date: c.date,
        dureeMinutes: c.dureeMinutes,
        patientId: c.patientId,
        patientLabel: `${c.patient.prenom} ${c.patient.nom}`
      });
    }
  }
  return hits;
}

/**
 * Erreur dédiée pour les conflits — permet à l'UI d'afficher un bypass explicite.
 */
export class SeanceConflictError extends Error {
  readonly conflicts: ConflictHit[];
  constructor(conflicts: ConflictHit[]) {
    super(
      `Conflit de planning : ${conflicts.length} séance(s) déjà sur ce créneau (${conflicts
        .map((c) => `${c.patientLabel} à ${c.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`)
        .join(", ")})`
    );
    this.name = "SeanceConflictError";
    this.conflicts = conflicts;
  }
}
