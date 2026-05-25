"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { patientSchema, type PatientInput } from "@/lib/validators/patient";
import { withAudit } from "@/server/with-audit";
import { TAGS_ON_PATIENT_CHANGE } from "@/server/cache-tags";

function invalidatePatientCaches() {
  for (const tag of TAGS_ON_PATIENT_CHANGE) revalidateTag(tag);
}

export interface ListPatientsOptions {
  q?: string;
  /** Filtre statut actif/inactif. `undefined` = tous. */
  actif?: boolean;
  /** Au moins un de ces tagIds doit être présent (OR). */
  tagIds?: string[];
  /** Création entre ces bornes. */
  createdFrom?: Date;
  createdTo?: Date;
  /** Patient ayant au moins une séance dans cette plage. */
  hasSeanceFrom?: Date;
  hasSeanceTo?: Date;
}

export async function listPatients(optsOrQuery?: string | ListPatientsOptions) {
  // Rétrocompat : `listPatients("query")` continue de fonctionner.
  const opts: ListPatientsOptions =
    typeof optsOrQuery === "string" ? { q: optsOrQuery } : optsOrQuery ?? {};

  const AND: Array<Record<string, unknown>> = [];

  if (opts.q && opts.q.trim().length > 0) {
    AND.push({
      OR: [
        { nom: { contains: opts.q } },
        { prenom: { contains: opts.q } },
        { email: { contains: opts.q } }
      ]
    });
  }
  if (typeof opts.actif === "boolean") AND.push({ actif: opts.actif });
  if (opts.createdFrom || opts.createdTo) {
    AND.push({
      createdAt: {
        gte: opts.createdFrom ?? undefined,
        lte: opts.createdTo ?? undefined
      }
    });
  }
  if (opts.tagIds && opts.tagIds.length > 0) {
    AND.push({ tags: { some: { tagId: { in: opts.tagIds } } } });
  }
  if (opts.hasSeanceFrom || opts.hasSeanceTo) {
    AND.push({
      seances: {
        some: {
          date: {
            gte: opts.hasSeanceFrom ?? undefined,
            lte: opts.hasSeanceTo ?? undefined
          }
        }
      }
    });
  }

  return prisma.patient.findMany({
    where: AND.length > 0 ? { AND } : undefined,
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: {
      _count: { select: { seances: true, factures: true } },
      tags: { include: { tag: true } }
    }
  });
}

export async function getPatient(id: string) {
  return prisma.patient.findUnique({
    where: { id },
    include: {
      seances: { orderBy: { date: "desc" }, take: 50 },
      factures: { orderBy: { dateEmission: "desc" }, take: 50 }
    }
  });
}

function cleanInput(raw: PatientInput) {
  const cleaned: Record<string, unknown> = { ...raw };
  for (const k of Object.keys(cleaned)) {
    if (cleaned[k] === "") cleaned[k] = null;
  }
  return cleaned;
}

export async function createPatient(input: PatientInput) {
  const parsed = patientSchema.parse(input);
  const patient = await withAudit({
    entityType: "Patient",
    action: "CREATE",
    fn: () => prisma.patient.create({ data: cleanInput(parsed) as never })
  });
  invalidatePatientCaches();
  revalidatePath("/patients");
  revalidatePath("/dashboard");
  return patient;
}

export async function updatePatient(id: string, input: PatientInput) {
  const parsed = patientSchema.parse(input);
  const patient = await withAudit({
    entityType: "Patient",
    action: "UPDATE",
    entityId: id,
    loadBefore: () => prisma.patient.findUnique({ where: { id } }),
    fn: () =>
      prisma.patient.update({
        where: { id },
        data: cleanInput(parsed) as never
      })
  });
  invalidatePatientCaches();
  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`);
  return patient;
}

export async function deletePatient(id: string) {
  await withAudit({
    entityType: "Patient",
    action: "DELETE",
    entityId: id,
    loadBefore: () => prisma.patient.findUnique({ where: { id } }),
    fn: () => prisma.patient.delete({ where: { id } })
  });
  invalidatePatientCaches();
  revalidatePath("/patients");
  revalidatePath("/dashboard");
}
