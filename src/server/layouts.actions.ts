"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  CURRENT_LAYOUT_SCHEMA_VERSION,
  DEFAULT_GRID_CONFIG,
  type GridConfig,
  type LayoutDefinition,
  type ModuleConfig,
  type TabKey
} from "@/editor/types";
import {
  deserializeGridConfig,
  deserializeModules,
  parseGridConfig,
  parseModules,
  parseTabKey,
  serializeGridConfig,
  serializeModules
} from "@/editor/utils/layout-serialization";

const REVALIDATE_PATHS: Record<TabKey, string> = {
  dashboard: "/dashboard",
  patients: "/patients",
  seances: "/seances",
  factures: "/factures",
  kpi: "/kpi",
  parametres: "/parametres"
};

export async function getLayout(
  tabKey: TabKey,
  name: string = "Default"
): Promise<LayoutDefinition | null> {
  try {
    const row = await prisma.layout.findFirst({
      where: { tabKey, name, userId: null }
    });
    if (!row) return null;
    return {
      id: row.id,
      tabKey: row.tabKey as TabKey,
      name: row.name,
      isDefault: row.isDefault,
      modules: deserializeModules(row.modules),
      gridConfig: deserializeGridConfig(row.gridConfig),
      schemaVersion: row.schemaVersion
    };
  } catch (e) {
    // Table Layout absente (migration non appliquée) → fonctionnement legacy.
    if (process.env.NODE_ENV === "development") {
      console.warn("[getLayout] échec lecture, lancez `npm run db:migrate`:", e);
    }
    return null;
  }
}

export async function saveLayout(input: {
  tabKey: TabKey;
  name?: string;
  modules: ModuleConfig[];
  gridConfig: GridConfig;
}): Promise<LayoutDefinition> {
  const tabKey = parseTabKey(input.tabKey);
  if (!tabKey) throw new Error("tabKey invalide");
  const modules = parseModules(input.modules);
  const gridConfig = parseGridConfig(input.gridConfig);
  const name = input.name?.trim() || "Default";

  const existing = await prisma.layout.findFirst({
    where: { tabKey, name, userId: null }
  });

  const data = {
    tabKey,
    name,
    isDefault: name === "Default",
    modules: serializeModules(modules),
    gridConfig: serializeGridConfig(gridConfig),
    schemaVersion: CURRENT_LAYOUT_SCHEMA_VERSION
  };

  const row = existing
    ? await prisma.layout.update({ where: { id: existing.id }, data })
    : await prisma.layout.create({ data: { ...data, userId: null } });

  revalidatePath(REVALIDATE_PATHS[tabKey]);

  return {
    id: row.id,
    tabKey: row.tabKey as TabKey,
    name: row.name,
    isDefault: row.isDefault,
    modules,
    gridConfig,
    schemaVersion: row.schemaVersion
  };
}

export async function resetLayout(tabKey: TabKey, name: string = "Default"): Promise<void> {
  const parsedTab = parseTabKey(tabKey);
  if (!parsedTab) throw new Error("tabKey invalide");
  await prisma.layout.deleteMany({ where: { tabKey: parsedTab, name, userId: null } });
  revalidatePath(REVALIDATE_PATHS[parsedTab]);
}

export async function listPresets(tabKey: TabKey) {
  const parsedTab = parseTabKey(tabKey);
  if (!parsedTab) throw new Error("tabKey invalide");
  try {
    return await prisma.layoutPreset.findMany({
      where: { tabKey: parsedTab },
      orderBy: [{ isBuiltIn: "desc" }, { createdAt: "asc" }]
    });
  } catch {
    return [];
  }
}

export async function applyPreset(presetId: string): Promise<LayoutDefinition> {
  const preset = await prisma.layoutPreset.findUnique({ where: { id: presetId } });
  if (!preset) throw new Error("Preset introuvable");
  const tabKey = parseTabKey(preset.tabKey);
  if (!tabKey) throw new Error("tabKey invalide");
  const modules = deserializeModules(preset.modules);
  return saveLayout({
    tabKey,
    modules,
    gridConfig: DEFAULT_GRID_CONFIG
  });
}

export async function exportLayout(tabKey: TabKey, name: string = "Default"): Promise<string> {
  const layout = await getLayout(tabKey, name);
  if (!layout) throw new Error("Layout introuvable");
  return JSON.stringify(
    {
      version: CURRENT_LAYOUT_SCHEMA_VERSION,
      tabKey: layout.tabKey,
      name: layout.name,
      modules: layout.modules,
      gridConfig: layout.gridConfig
    },
    null,
    2
  );
}

export async function importLayout(json: string, targetTab?: TabKey): Promise<LayoutDefinition> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("JSON invalide");
  }
  const obj = parsed as {
    tabKey?: string;
    modules?: unknown;
    gridConfig?: unknown;
  };
  const tabKey = parseTabKey(targetTab ?? obj.tabKey);
  if (!tabKey) throw new Error("tabKey invalide dans le JSON importé");
  return saveLayout({
    tabKey,
    modules: parseModules(obj.modules),
    gridConfig: parseGridConfig(obj.gridConfig)
  });
}
