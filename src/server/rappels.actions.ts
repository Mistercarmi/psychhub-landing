"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAudit } from "@/server/with-audit";

export interface SeanceRappel {
  id: string;
  date: Date;
  dureeMinutes: number;
  statut: string;
  patientId: string;
  patientPrenom: string;
  patientNom: string;
  patientEmail: string;
}

const HOURS_RATTRAPAGE = 24;

type SeanceWithPatient = Awaited<
  ReturnType<typeof prisma.seance.findMany>
>[number] & {
  patient: { id: string; prenom: string; nom: string; email: string | null };
};

function toRappel(s: SeanceWithPatient): SeanceRappel {
  return {
    id: s.id,
    date: s.date,
    dureeMinutes: s.dureeMinutes,
    statut: s.statut,
    patientId: s.patient.id,
    patientPrenom: s.patient.prenom,
    patientNom: s.patient.nom,
    patientEmail: s.patient.email ?? ""
  };
}

/**
 * Liste les séances candidates au rappel mail, séparées en 2 buckets :
 * - `aEnvoyer` : séances dans la fenêtre `[now, now + Config.rappelsHeuresAvant]`
 * - `enRetard` : séances passées dans les `HOURS_RATTRAPAGE` dernières heures
 *   non encore rappelées (rattrapage si l'utilisateur n'a pas ouvert l'app à temps)
 *
 * Filtrage :
 * - statut === "PLANIFIEE" (utilise l'index `[statut, date]`)
 * - patient.email non null + patient.actif === true (RGPD : on ne sort pas d'email orphelin)
 * - rappelEnvoyeAt === null
 *
 * Données retournées **strictement minimales** (id, nom, prénom, email patient) —
 * pas de notes cliniques, motif consult, etc.
 */
export async function listerRappelsEnAttente(): Promise<{
  aEnvoyer: SeanceRappel[];
  enRetard: SeanceRappel[];
  rappelsActifs: boolean;
  rappelsHeuresAvant: number;
}> {
  const config = await prisma.config.findUnique({ where: { id: "default" } });
  const rappelsActifs = config?.rappelsActifs ?? false;
  const heuresAvant = config?.rappelsHeuresAvant ?? 24;

  const now = new Date();
  const horizon = new Date(now.getTime() + heuresAvant * 3_600_000);
  const debutRattrapage = new Date(now.getTime() - HOURS_RATTRAPAGE * 3_600_000);

  const baseWhere = {
    statut: "PLANIFIEE",
    rappelEnvoyeAt: null,
    patient: { email: { not: null }, actif: true }
  } as const;

  const select = {
    id: true,
    prenom: true,
    nom: true,
    email: true
  };

  const [aEnvoyer, enRetard] = await Promise.all([
    prisma.seance.findMany({
      where: { ...baseWhere, date: { gte: now, lte: horizon } },
      include: { patient: { select } },
      orderBy: { date: "asc" }
    }),
    prisma.seance.findMany({
      where: { ...baseWhere, date: { gte: debutRattrapage, lt: now } },
      include: { patient: { select } },
      orderBy: { date: "asc" }
    })
  ]);

  return {
    aEnvoyer: aEnvoyer.map((s) => toRappel(s as SeanceWithPatient)),
    enRetard: enRetard.map((s) => toRappel(s as SeanceWithPatient)),
    rappelsActifs,
    rappelsHeuresAvant: heuresAvant
  };
}

/**
 * Compte les rappels en attente (fenêtre + retard). Alimente le badge sidebar.
 * Retourne 0 si la fonctionnalité est désactivée (évite d'afficher un nombre
 * qui ne mène à aucune action utile).
 */
export async function compterRappelsEnAttente(): Promise<number> {
  const config = await prisma.config.findUnique({
    where: { id: "default" },
    select: { rappelsActifs: true, rappelsHeuresAvant: true }
  });
  if (!config?.rappelsActifs) return 0;

  const now = new Date();
  const horizon = new Date(now.getTime() + (config.rappelsHeuresAvant ?? 24) * 3_600_000);
  const debutRattrapage = new Date(now.getTime() - HOURS_RATTRAPAGE * 3_600_000);

  return prisma.seance.count({
    where: {
      statut: "PLANIFIEE",
      rappelEnvoyeAt: null,
      patient: { email: { not: null }, actif: true },
      date: { gte: debutRattrapage, lte: horizon }
    }
  });
}

const marquerSchema = z.object({ seanceId: z.string().cuid() });

/**
 * Marque une séance comme rappelée. Idempotent : si déjà marqué, no-op silencieux.
 * Retourne `true` si le marquage a réellement eu lieu, `false` sinon.
 */
export async function marquerRappelEnvoye(seanceId: string): Promise<boolean> {
  const parsed = marquerSchema.safeParse({ seanceId });
  if (!parsed.success) throw new Error("Identifiant séance invalide");

  // update conditionnel : ne touche que si rappelEnvoyeAt est encore null
  const result = await withAudit({
    entityType: "Seance",
    action: "UPDATE",
    entityId: parsed.data.seanceId,
    loadBefore: () =>
      prisma.seance.findUnique({
        where: { id: parsed.data.seanceId },
        select: { rappelEnvoyeAt: true }
      }),
    fn: async () => {
      const r = await prisma.seance.updateMany({
        where: { id: parsed.data.seanceId, rappelEnvoyeAt: null },
        data: { rappelEnvoyeAt: new Date() }
      });
      return { id: parsed.data.seanceId, marked: r.count > 0 };
    }
  });

  revalidatePath("/rappels");
  revalidatePath("/seances");
  return result.marked;
}

const batchSchema = z.object({
  seanceIds: z.array(z.string().cuid()).min(1).max(200)
});

/**
 * Marque plusieurs séances comme rappelées en une fois.
 * Retourne le nombre réellement marqué (idempotent).
 * Audit log : une entrée par séance effectivement marquée (cohérent avec la version unitaire).
 */
export async function marquerRappelsEnvoyesBatch(seanceIds: string[]): Promise<number> {
  const parsed = batchSchema.safeParse({ seanceIds });
  if (!parsed.success) throw new Error("Liste de séances invalide");

  const aMarquer = await prisma.seance.findMany({
    where: { id: { in: parsed.data.seanceIds }, rappelEnvoyeAt: null },
    select: { id: true, rappelEnvoyeAt: true }
  });

  if (aMarquer.length === 0) {
    revalidatePath("/rappels");
    revalidatePath("/seances");
    return 0;
  }

  let marked = 0;
  for (const s of aMarquer) {
    await withAudit({
      entityType: "Seance",
      action: "UPDATE",
      entityId: s.id,
      loadBefore: async () => ({ rappelEnvoyeAt: s.rappelEnvoyeAt }),
      fn: async () => {
        const r = await prisma.seance.updateMany({
          where: { id: s.id, rappelEnvoyeAt: null },
          data: { rappelEnvoyeAt: new Date() }
        });
        if (r.count > 0) marked++;
        return { id: s.id, marked: r.count > 0 };
      }
    });
  }

  revalidatePath("/rappels");
  revalidatePath("/seances");
  return marked;
}
