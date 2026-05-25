"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export interface MappingPreset {
  id: string;
  name: string;
  source: string;
  targetEntity: string;
  mapping: Record<string, string>;
  createdAt: string;
}

function parseMapping(raw: string): Record<string, string> {
  try {
    const o = JSON.parse(raw);
    if (o && typeof o === "object" && !Array.isArray(o)) {
      return Object.fromEntries(
        Object.entries(o).map(([k, v]) => [k, String(v ?? "")])
      );
    }
  } catch {
    // silencieux
  }
  return {};
}

export async function listImportMappingPresets(
  filter?: { source?: string; targetEntity?: string }
): Promise<MappingPreset[]> {
  const rows = await prisma.importMappingPreset.findMany({
    where: {
      source: filter?.source,
      targetEntity: filter?.targetEntity
    },
    orderBy: { name: "asc" }
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    source: r.source,
    targetEntity: r.targetEntity,
    mapping: parseMapping(r.mapping),
    createdAt: r.createdAt.toISOString()
  }));
}

export async function saveImportMappingPreset(input: {
  name: string;
  source: string;
  targetEntity: string;
  mapping: Record<string, string>;
}): Promise<MappingPreset> {
  const name = input.name.trim();
  if (!name) throw new Error("Nom requis");
  if (!input.source) throw new Error("Source requise (doctolib | excel | csv | gsheets)");
  if (!input.targetEntity) throw new Error("Cible requise (patients | seances | factures)");

  const mappingStr = JSON.stringify(input.mapping ?? {});
  const existing = await prisma.importMappingPreset.findFirst({
    where: { name, targetEntity: input.targetEntity }
  });

  const row = existing
    ? await prisma.importMappingPreset.update({
        where: { id: existing.id },
        data: { source: input.source, mapping: mappingStr }
      })
    : await prisma.importMappingPreset.create({
        data: {
          name,
          source: input.source,
          targetEntity: input.targetEntity,
          mapping: mappingStr
        }
      });

  revalidatePath("/import-export");
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    targetEntity: row.targetEntity,
    mapping: parseMapping(row.mapping),
    createdAt: row.createdAt.toISOString()
  };
}

export async function deleteImportMappingPreset(id: string): Promise<void> {
  await prisma.importMappingPreset.delete({ where: { id } });
  revalidatePath("/import-export");
}
