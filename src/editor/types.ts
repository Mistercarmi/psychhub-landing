import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { z } from "zod";

export const TAB_KEYS = [
  "dashboard",
  "patients",
  "seances",
  "factures",
  "kpi",
  "parametres"
] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export const MODULE_CATEGORIES = ["KPI", "Charts", "Tables", "Listes", "Utils"] as const;
export type ModuleCategory = (typeof MODULE_CATEGORIES)[number];

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ModuleConfig<TProps extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: string;
  gridPosition: GridPosition;
  props: TProps;
  visible: boolean;
}

export interface GridConfig {
  cols: number;
  rowHeight: number;
  gap: number;
  compactType: "vertical" | "horizontal" | null;
}

export interface LayoutDefinition {
  id: string;
  tabKey: TabKey;
  name: string;
  isDefault: boolean;
  modules: ModuleConfig[];
  gridConfig: GridConfig;
  schemaVersion: number;
}

export interface ModuleDataContext {
  tabKey: TabKey;
}

export interface ModuleProps<TProps extends Record<string, unknown> = Record<string, unknown>> {
  moduleId: string;
  props: TProps;
  isEditing: boolean;
}

export interface ModuleType<TProps extends Record<string, unknown> = Record<string, unknown>> {
  key: string;
  name: string;
  description: string;
  category: ModuleCategory;
  icon: LucideIcon;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize?: { w: number; h: number };
  defaultProps: TProps;
  // Schéma Zod : on accepte ZodTypeAny pour éviter les conflits input/output liés aux .default()
  configSchema: z.ZodTypeAny;
  component: ComponentType<ModuleProps<TProps>>;
  compatibleTabs?: TabKey[];
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
  cols: 12,
  rowHeight: 60,
  gap: 16,
  compactType: "vertical"
};

export const CURRENT_LAYOUT_SCHEMA_VERSION = 1;
