"use client";

import { createContext, useContext, type ReactNode } from "react";
import type {
  DashboardModulesData,
  FacturesModulesData,
  KpiModulesData,
  PatientsModulesData,
  SeancesModulesData
} from "@/server/modules-data.actions";
import type { TabKey } from "../types";

export interface ModulesDataByTab {
  dashboard?: DashboardModulesData;
  kpi?: KpiModulesData;
  patients?: PatientsModulesData;
  seances?: SeancesModulesData;
  factures?: FacturesModulesData;
}

const ModulesDataContext = createContext<ModulesDataByTab>({});

export function ModulesDataProvider({
  data,
  children
}: {
  data: ModulesDataByTab;
  children: ReactNode;
}) {
  return <ModulesDataContext.Provider value={data}>{children}</ModulesDataContext.Provider>;
}

export function useDashboardData(): DashboardModulesData | undefined {
  return useContext(ModulesDataContext).dashboard;
}

export function useModulesData(): ModulesDataByTab {
  return useContext(ModulesDataContext);
}

export function useTabData<T = unknown>(tab: TabKey): T | undefined {
  const ctx = useContext(ModulesDataContext) as Record<string, unknown>;
  return ctx[tab] as T | undefined;
}
