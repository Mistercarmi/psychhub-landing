import { z } from "zod";
import {
  CURRENT_LAYOUT_SCHEMA_VERSION,
  DEFAULT_GRID_CONFIG,
  TAB_KEYS,
  type GridConfig,
  type LayoutDefinition,
  type ModuleConfig,
  type TabKey
} from "../types";

const gridPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(20)
});

const moduleConfigSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  gridPosition: gridPositionSchema,
  props: z.record(z.unknown()).default({}),
  visible: z.boolean().default(true)
});

const gridConfigSchema = z.object({
  cols: z.number().int().min(1).max(24).default(DEFAULT_GRID_CONFIG.cols),
  rowHeight: z.number().min(20).max(200).default(DEFAULT_GRID_CONFIG.rowHeight),
  gap: z.number().min(0).max(64).default(DEFAULT_GRID_CONFIG.gap),
  compactType: z.enum(["vertical", "horizontal"]).nullable().default(DEFAULT_GRID_CONFIG.compactType)
});

const tabKeySchema = z.enum(TAB_KEYS);

export function parseModules(raw: unknown): ModuleConfig[] {
  const parsed = z.array(moduleConfigSchema).safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data as ModuleConfig[];
}

export function parseGridConfig(raw: unknown): GridConfig {
  const parsed = gridConfigSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_GRID_CONFIG;
  return parsed.data as GridConfig;
}

export function parseTabKey(raw: unknown): TabKey | null {
  const parsed = tabKeySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function serializeModules(modules: ModuleConfig[]): string {
  return JSON.stringify(modules);
}

export function serializeGridConfig(grid: GridConfig): string {
  return JSON.stringify(grid);
}

export function deserializeModules(raw: string): ModuleConfig[] {
  try {
    return parseModules(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function deserializeGridConfig(raw: string): GridConfig {
  try {
    return parseGridConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_GRID_CONFIG;
  }
}

export function migrateLayoutIfNeeded(
  layout: LayoutDefinition
): LayoutDefinition {
  if (layout.schemaVersion === CURRENT_LAYOUT_SCHEMA_VERSION) return layout;
  return { ...layout, schemaVersion: CURRENT_LAYOUT_SCHEMA_VERSION };
}

export { moduleConfigSchema, gridConfigSchema, tabKeySchema };
