import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears
} from "date-fns";

export type DateRangePreset =
  | "today"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "last12Months"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

export const DATE_RANGE_PRESET_LABELS: Record<Exclude<DateRangePreset, "custom">, string> = {
  today: "Aujourd'hui",
  last7: "7 derniers jours",
  last30: "30 derniers jours",
  thisMonth: "Mois en cours",
  lastMonth: "Mois précédent",
  thisYear: "Année en cours",
  lastYear: "Année précédente",
  last12Months: "12 derniers mois"
};

/**
 * Calcule la plage `{from, to}` à partir d'un preset, en ancrant sur `anchor` (défaut: now).
 * Retourne null pour `custom` car le caller fournit ses propres bornes.
 */
export function resolveRange(preset: DateRangePreset, anchor: Date = new Date()): DateRange | null {
  switch (preset) {
    case "today":
      return { from: startOfDay(anchor), to: endOfDay(anchor) };
    case "last7":
      return { from: startOfDay(subDays(anchor, 6)), to: endOfDay(anchor) };
    case "last30":
      return { from: startOfDay(subDays(anchor, 29)), to: endOfDay(anchor) };
    case "thisMonth":
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    case "lastMonth": {
      const lm = subMonths(anchor, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case "thisYear":
      return { from: startOfYear(anchor), to: endOfYear(anchor) };
    case "lastYear": {
      const ly = subYears(anchor, 1);
      return { from: startOfYear(ly), to: endOfYear(ly) };
    }
    case "last12Months":
      return { from: startOfDay(subMonths(anchor, 12)), to: endOfDay(anchor) };
    case "custom":
      return null;
  }
}

/**
 * Renvoie la période précédente immédiate (même durée), utile pour les comparaisons MoM/YoY.
 * - "prev"  : décale d'exactement la même durée en arrière.
 * - "yoy"   : décale d'un an en arrière, en conservant la durée.
 */
export function previousPeriod(range: DateRange, mode: "prev" | "yoy" = "prev"): DateRange {
  if (mode === "yoy") {
    return { from: subYears(range.from, 1), to: subYears(range.to, 1) };
  }
  const days = differenceInCalendarDays(range.to, range.from);
  const newTo = subDays(range.from, 1);
  const newFrom = addDays(newTo, -days);
  return { from: startOfDay(newFrom), to: endOfDay(newTo) };
}

/**
 * Sérialise une plage en `searchParams` (`YYYY-MM-DD`).
 * Stable et indépendant de la timezone (utilise la date locale).
 */
export function rangeToSearchParams(
  range: DateRange | null,
  preset: DateRangePreset = "custom"
): { from?: string; to?: string; preset?: string } {
  if (!range) return {};
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return { from: fmt(range.from), to: fmt(range.to), preset };
}

/**
 * Reconstruit une `DateRange` depuis `searchParams`. Si `preset` est fourni et != "custom",
 * il prévaut sur from/to (presets vivent dans le temps).
 */
export function rangeFromSearchParams(params: {
  from?: string | null;
  to?: string | null;
  preset?: string | null;
}): { range: DateRange | null; preset: DateRangePreset } {
  const preset = (params.preset ?? "custom") as DateRangePreset;
  if (preset && preset !== "custom") {
    const resolved = resolveRange(preset);
    if (resolved) return { range: resolved, preset };
  }
  if (params.from && params.to) {
    const from = new Date(`${params.from}T00:00:00`);
    const to = new Date(`${params.to}T23:59:59.999`);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { range: { from, to }, preset: "custom" };
    }
  }
  return { range: null, preset: "custom" };
}

export function formatRangeLabel(range: DateRange | null): string {
  if (!range) return "Toute la période";
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const fromLabel = fmt.format(range.from);
  const toLabel = fmt.format(range.to);
  return fromLabel === toLabel ? fromLabel : `${fromLabel} → ${toLabel}`;
}

export function isSameRange(a: DateRange | null, b: DateRange | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.from.getTime() === b.from.getTime() && a.to.getTime() === b.to.getTime();
}

// Re-export pratique pour les call-sites.
export { addMonths, addYears };
