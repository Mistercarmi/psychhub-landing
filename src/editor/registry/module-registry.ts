import type { ModuleType, TabKey } from "../types";

const registry = new Map<string, ModuleType<any>>();

export function registerModule<TProps extends Record<string, unknown>>(
  module: ModuleType<TProps>
): void {
  if (registry.has(module.key)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[module-registry] type "${module.key}" déjà enregistré, écrasement.`);
    }
  }
  registry.set(module.key, module as ModuleType<any>);
}

export function getModule(key: string): ModuleType<any> | undefined {
  return registry.get(key);
}

export function getAllModules(): ModuleType<any>[] {
  return Array.from(registry.values());
}

export function getModulesForTab(tab: TabKey): ModuleType<any>[] {
  return getAllModules().filter(
    (m) => !m.compatibleTabs || m.compatibleTabs.includes(tab)
  );
}

export function hasModule(key: string): boolean {
  return registry.has(key);
}

export function clearRegistry(): void {
  registry.clear();
}
