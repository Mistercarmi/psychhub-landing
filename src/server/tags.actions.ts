"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { withAudit } from "@/server/with-audit";

export interface TagSummary {
  id: string;
  name: string;
  color: string | null;
  patientsCount: number;
  seancesCount: number;
  facturesCount: number;
}

export async function listTags(): Promise<TagSummary[]> {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { patients: true, seances: true, factures: true } }
    }
  });
  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    patientsCount: t._count.patients,
    seancesCount: t._count.seances,
    facturesCount: t._count.factures
  }));
}

export async function createTag(input: { name: string; color?: string | null }) {
  const name = input.name.trim();
  if (!name) throw new Error("Nom requis");
  const existing = await prisma.tag.findUnique({ where: { name } });
  if (existing) return existing;
  const tag = await withAudit({
    entityType: "Tag",
    action: "CREATE",
    fn: () => prisma.tag.create({ data: { name, color: input.color ?? null } })
  });
  revalidatePath("/patients");
  return tag;
}

export async function renameTag(id: string, name: string, color?: string | null) {
  const updated = await withAudit({
    entityType: "Tag",
    action: "UPDATE",
    entityId: id,
    loadBefore: () => prisma.tag.findUnique({ where: { id } }),
    fn: () =>
      prisma.tag.update({
        where: { id },
        data: { name: name.trim(), color: color ?? undefined }
      })
  });
  revalidatePath("/patients");
  return updated;
}

export async function deleteTag(id: string) {
  await withAudit({
    entityType: "Tag",
    action: "DELETE",
    entityId: id,
    loadBefore: () => prisma.tag.findUnique({ where: { id } }),
    fn: () => prisma.tag.delete({ where: { id } })
  });
  revalidatePath("/patients");
}

export async function assignTagsToPatient(patientId: string, tagIds: string[]) {
  // Remplace l'ensemble des tags du patient par `tagIds`.
  const before = await prisma.patientTag.findMany({ where: { patientId } });
  await withAudit({
    entityType: "Patient",
    action: "UPDATE",
    entityId: patientId,
    loadBefore: async () => ({ tagIds: before.map((b) => b.tagId) }),
    fn: async () => {
      await prisma.patientTag.deleteMany({ where: { patientId } });
      if (tagIds.length > 0) {
        await prisma.patientTag.createMany({
          data: tagIds.map((tagId) => ({ patientId, tagId }))
        });
      }
      return { patientId, tagIds };
    }
  });
  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
}
