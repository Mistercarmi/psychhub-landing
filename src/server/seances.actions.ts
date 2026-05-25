"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import {
  doctolibBatchSchema,
  seanceSchema,
  type DoctolibRow,
  type SeanceInput
} from "@/lib/validators/seance";
import { SEANCE_STATUTS, type SeanceStatut } from "@/lib/utils";
import { withAudit } from "@/server/with-audit";
import { detectConflicts, SeanceConflictError } from "@/lib/seances/conflict";
import { TAGS_ON_SEANCE_CHANGE } from "@/server/cache-tags";

function invalidateSeanceCaches() {
  for (const tag of TAGS_ON_SEANCE_CHANGE) revalidateTag(tag);
}

export interface CreateSeanceOptions {
  /** Si true, ignore les conflits de planning. À utiliser uniquement après confirmation utilisateur. */
  bypassConflictCheck?: boolean;
}

export async function listSeances(opts?: { from?: Date; to?: Date; patientId?: string }) {
  return prisma.seance.findMany({
    where: {
      patientId: opts?.patientId,
      date: opts?.from || opts?.to ? { gte: opts?.from, lte: opts?.to } : undefined
    },
    orderBy: { date: "desc" },
    include: { patient: true, facture: { select: { id: true, numero: true, statut: true } } }
  });
}

export async function createSeance(input: SeanceInput, opts: CreateSeanceOptions = {}) {
  const parsed = seanceSchema.parse(input);
  if (!opts.bypassConflictCheck && (parsed.statut === "PLANIFIEE" || parsed.statut === "HONOREE")) {
    const conflicts = await detectConflicts({
      date: parsed.date,
      dureeMinutes: parsed.dureeMinutes
    });
    if (conflicts.length > 0) throw new SeanceConflictError(conflicts);
  }
  const seance = await withAudit({
    entityType: "Seance",
    action: "CREATE",
    fn: () =>
      prisma.seance.create({
        data: { ...parsed, sourceImport: "manuel" }
      })
  });
  invalidateSeanceCaches();
  revalidatePath("/seances");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${parsed.patientId}`);
  return seance;
}

export async function updateSeance(id: string, input: SeanceInput, opts: CreateSeanceOptions = {}) {
  const parsed = seanceSchema.parse(input);
  if (!opts.bypassConflictCheck && (parsed.statut === "PLANIFIEE" || parsed.statut === "HONOREE")) {
    const conflicts = await detectConflicts({
      date: parsed.date,
      dureeMinutes: parsed.dureeMinutes,
      excludeId: id
    });
    if (conflicts.length > 0) throw new SeanceConflictError(conflicts);
  }
  const existing = await prisma.seance.findUnique({ where: { id } });
  const dateChanged = existing && existing.date.getTime() !== parsed.date.getTime();
  const seance = await withAudit({
    entityType: "Seance",
    action: "UPDATE",
    entityId: id,
    loadBefore: async () => existing,
    fn: () =>
      prisma.seance.update({
        where: { id },
        data: dateChanged ? { ...parsed, rappelEnvoyeAt: null } : parsed
      })
  });
  invalidateSeanceCaches();
  revalidatePath("/seances");
  revalidatePath("/dashboard");
  revalidatePath("/rappels");
  revalidatePath(`/patients/${parsed.patientId}`);
  return seance;
}

/**
 * Décale uniquement la date d'une séance (drag-drop calendrier).
 * Préserve durée/statut/tarif/patient. Vérifie les conflits sauf si bypass.
 */
export async function rescheduleSeance(
  id: string,
  newDate: Date,
  opts: CreateSeanceOptions = {}
) {
  const source = await prisma.seance.findUnique({ where: { id } });
  if (!source) throw new Error("Séance introuvable");
  if (!opts.bypassConflictCheck && (source.statut === "PLANIFIEE" || source.statut === "HONOREE")) {
    const conflicts = await detectConflicts({
      date: newDate,
      dureeMinutes: source.dureeMinutes,
      excludeId: id
    });
    if (conflicts.length > 0) throw new SeanceConflictError(conflicts);
  }
  const updated = await withAudit({
    entityType: "Seance",
    action: "UPDATE",
    entityId: id,
    loadBefore: async () => source,
    fn: () =>
      prisma.seance.update({
        where: { id },
        data: { date: newDate, rappelEnvoyeAt: null }
      })
  });
  invalidateSeanceCaches();
  revalidatePath("/seances");
  revalidatePath("/dashboard");
  revalidatePath("/rappels");
  revalidatePath(`/patients/${source.patientId}`);
  return updated;
}

export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly";

export interface RecurrenceOptions {
  frequency: RecurrenceFrequency;
  /** Fin par occurrences (`count`) OU par date (`until`). Au moins l'un des deux. */
  count?: number;
  until?: Date;
  /** Inclure ou non la séance source dans le compteur. Défaut: true. */
  includeFirst?: boolean;
}

function addRecurrenceStep(date: Date, frequency: RecurrenceFrequency): Date {
  const next = new Date(date);
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "biweekly") next.setDate(next.getDate() + 14);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

/**
 * Crée une série de séances récurrentes. Saute silencieusement les créneaux en conflit
 * sauf si `bypassConflictCheck` est activé. Retourne le détail.
 */
export async function createSeancesRecurrentes(
  base: SeanceInput,
  recurrence: RecurrenceOptions,
  opts: CreateSeanceOptions = {}
): Promise<{ created: number; skipped: number; firstId?: string }> {
  const parsed = seanceSchema.parse(base);
  if (!recurrence.count && !recurrence.until) {
    throw new Error("Récurrence : fournir `count` ou `until`.");
  }
  const max = recurrence.count ?? 200;
  const until = recurrence.until ?? null;
  const includeFirst = recurrence.includeFirst ?? true;

  let created = 0;
  let skipped = 0;
  let firstId: string | undefined;
  let cursor = new Date(parsed.date);
  let occurrenceIndex = 0;

  while (occurrenceIndex < max && (!until || cursor <= until)) {
    const shouldCreate = occurrenceIndex > 0 || includeFirst;
    if (shouldCreate) {
      if (!opts.bypassConflictCheck) {
        const conflicts = await detectConflicts({
          date: cursor,
          dureeMinutes: parsed.dureeMinutes
        });
        if (conflicts.length > 0) {
          skipped++;
          occurrenceIndex++;
          cursor = addRecurrenceStep(cursor, recurrence.frequency);
          continue;
        }
      }
      const created_ = await withAudit({
        entityType: "Seance",
        action: "CREATE",
        fn: () =>
          prisma.seance.create({
            data: {
              ...parsed,
              date: cursor,
              sourceImport: "manuel"
            }
          })
      });
      created++;
      if (!firstId) firstId = created_.id;
    }
    occurrenceIndex++;
    cursor = addRecurrenceStep(cursor, recurrence.frequency);
  }

  invalidateSeanceCaches();
  revalidatePath("/seances");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${parsed.patientId}`);
  return { created, skipped, firstId };
}

/**
 * Mutation rapide (1 clic) : change uniquement le statut d'une séance.
 * Auditée comme un UPDATE classique avec snapshot avant/après.
 */
export async function updateSeanceStatut(id: string, statut: SeanceStatut) {
  if (!SEANCE_STATUTS.includes(statut)) {
    throw new Error(`Statut invalide: ${statut}`);
  }
  const seance = await withAudit({
    entityType: "Seance",
    action: "UPDATE",
    entityId: id,
    loadBefore: () => prisma.seance.findUnique({ where: { id } }),
    fn: () => prisma.seance.update({ where: { id }, data: { statut } })
  });
  invalidateSeanceCaches();
  revalidatePath("/seances");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${seance.patientId}`);
  return seance;
}

/**
 * Duplique une séance en décalant la date de `offsetDays` jours (défaut: +7).
 * Conserve patient/durée/tarif/notes ; statut remis à PLANIFIEE ; jamais lié à une facture.
 */
export async function duplicateSeance(id: string, offsetDays = 7) {
  const source = await prisma.seance.findUnique({ where: { id } });
  if (!source) throw new Error("Séance introuvable");
  const nextDate = new Date(source.date);
  nextDate.setDate(nextDate.getDate() + offsetDays);
  const created = await withAudit({
    entityType: "Seance",
    action: "CREATE",
    fn: () =>
      prisma.seance.create({
        data: {
          patientId: source.patientId,
          date: nextDate,
          dureeMinutes: source.dureeMinutes,
          tarif: source.tarif,
          statut: "PLANIFIEE",
          notesSeance: source.notesSeance,
          sourceImport: "manuel"
        }
      })
  });
  invalidateSeanceCaches();
  revalidatePath("/seances");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${source.patientId}`);
  return created;
}

export async function deleteSeance(id: string) {
  const seance = await withAudit({
    entityType: "Seance",
    action: "DELETE",
    entityId: id,
    loadBefore: () => prisma.seance.findUnique({ where: { id } }),
    fn: () => prisma.seance.delete({ where: { id } })
  });
  invalidateSeanceCaches();
  revalidatePath("/seances");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${seance.patientId}`);
}

export async function importDoctolibSeances(
  rows: DoctolibRow[],
  tarifDefaut: number
): Promise<{ created: number; updated: number; patientsCreated: number; skipped: number }> {
  const parsed = doctolibBatchSchema.safeParse({ rows, tarifDefaut });
  if (!parsed.success) {
    throw new Error(`Données Doctolib invalides : ${parsed.error.issues[0]?.message ?? "format inconnu"}`);
  }
  const validatedRows = parsed.data.rows;
  const tarif = parsed.data.tarifDefaut;

  let created = 0;
  let updated = 0;
  let patientsCreated = 0;
  let skipped = 0;

  for (const row of validatedRows) {
    if (!row.doctolibRef || !row.patientNom) {
      skipped++;
      continue;
    }

    // Une transaction par ligne : atomicité patient+séance. Si le create séance échoue
    // après création patient, la ligne entière est annulée (pas de patient orphelin).
    const result = await prisma.$transaction(async (tx) => {
      let patient = row.patientEmail
        ? await tx.patient.findFirst({ where: { email: row.patientEmail } })
        : null;
      if (!patient) {
        patient = await tx.patient.findFirst({
          where: {
            nom: { equals: row.patientNom },
            prenom: { equals: row.patientPrenom }
          }
        });
      }
      let createdPatient = false;
      if (!patient) {
        patient = await tx.patient.create({
          data: {
            nom: row.patientNom,
            prenom: row.patientPrenom,
            email: row.patientEmail ?? null
          }
        });
        createdPatient = true;
      }

      const existing = await tx.seance.findUnique({ where: { doctolibRef: row.doctolibRef } });
      if (existing) {
        const updatedSeance = await tx.seance.update({
          where: { id: existing.id },
          data: {
            date: row.date,
            dureeMinutes: row.dureeMinutes,
            statut: row.statut,
            patientId: patient.id
          }
        });
        return { kind: "updated" as const, patient, createdPatient, before: existing, seance: updatedSeance };
      }
      const newSeance = await tx.seance.create({
        data: {
          doctolibRef: row.doctolibRef,
          date: row.date,
          dureeMinutes: row.dureeMinutes,
          tarif,
          statut: row.statut,
          sourceImport: "doctolib",
          patientId: patient.id
        }
      });
      return { kind: "created" as const, patient, createdPatient, seance: newSeance };
    });

    if (result.createdPatient) {
      patientsCreated++;
      await withAudit({
        entityType: "Patient",
        action: "CREATE",
        entityId: result.patient.id,
        fn: async () => result.patient
      });
    }
    if (result.kind === "updated") {
      updated++;
      await withAudit({
        entityType: "Seance",
        action: "UPDATE",
        entityId: result.seance.id,
        loadBefore: async () => result.before,
        fn: async () => result.seance
      });
    } else {
      created++;
      await withAudit({
        entityType: "Seance",
        action: "CREATE",
        entityId: result.seance.id,
        fn: async () => result.seance
      });
    }
  }

  invalidateSeanceCaches();
  revalidatePath("/seances");
  revalidatePath("/dashboard");
  return { created, updated, patientsCreated, skipped };
}
