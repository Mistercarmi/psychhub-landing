"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  type DateRange,
  type DateRangePreset,
  rangeFromSearchParams,
  rangeToSearchParams
} from "@/lib/date-range";

/**
 * Hook synchronisé sur l'URL (?from=YYYY-MM-DD&to=YYYY-MM-DD&preset=...).
 * Persisté gratuitement à F5 + partageable. À utiliser dans les pages de reporting.
 */
export function useDateRange() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { range, preset } = useMemo(
    () =>
      rangeFromSearchParams({
        from: searchParams.get("from"),
        to: searchParams.get("to"),
        preset: searchParams.get("preset")
      }),
    [searchParams]
  );

  const setRange = useCallback(
    (next: DateRange | null, nextPreset: DateRangePreset = "custom") => {
      const params = new URLSearchParams(searchParams.toString());
      const serialized = rangeToSearchParams(next, nextPreset);
      if (serialized.from) params.set("from", serialized.from);
      else params.delete("from");
      if (serialized.to) params.set("to", serialized.to);
      else params.delete("to");
      if (serialized.preset) params.set("preset", serialized.preset);
      else params.delete("preset");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const setPreset = useCallback(
    (nextPreset: DateRangePreset) => {
      if (nextPreset === "custom") {
        // Conserve la plage actuelle ; juste change le preset.
        const params = new URLSearchParams(searchParams.toString());
        params.set("preset", "custom");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        return;
      }
      const { range: resolved } = rangeFromSearchParams({ preset: nextPreset });
      setRange(resolved, nextPreset);
    },
    [router, pathname, searchParams, setRange]
  );

  const clear = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    params.delete("preset");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  return { range, preset, setRange, setPreset, clear };
}
