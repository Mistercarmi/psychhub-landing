/**
 * Tags de cache partagés entre les server actions de lecture (getXxxModulesData)
 * et les mutations qui doivent invalider ces caches.
 *
 * Toute mutation côté server actions doit appeler `revalidateTag(...)` avec
 * les tags adéquats — voir `src/server/{patients,seances,factures}.actions.ts`.
 */

export const CACHE_TAGS = {
  /** Stats globales utilisées par le dashboard et les modules KPI. */
  dashboard: "dashboard-data",
  kpi: "kpi-data",
  patients: "patients-data",
  seances: "seances-data",
  factures: "factures-data"
} as const;

/**
 * Tags à invalider quand une **séance** est créée/modifiée/supprimée.
 * Touche presque tout car KPI/Dashboard sont alimentés par les séances.
 */
export const TAGS_ON_SEANCE_CHANGE = [
  CACHE_TAGS.dashboard,
  CACHE_TAGS.kpi,
  CACHE_TAGS.seances,
  CACHE_TAGS.patients
] as const;

/** Tags à invalider quand une **facture** change. */
export const TAGS_ON_FACTURE_CHANGE = [
  CACHE_TAGS.dashboard,
  CACHE_TAGS.kpi,
  CACHE_TAGS.factures
] as const;

/** Tags à invalider quand un **patient** change. */
export const TAGS_ON_PATIENT_CHANGE = [
  CACHE_TAGS.dashboard,
  CACHE_TAGS.kpi,
  CACHE_TAGS.patients
] as const;
