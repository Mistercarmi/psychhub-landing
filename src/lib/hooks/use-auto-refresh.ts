"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export interface UseAutoRefreshOptions {
  /** Intervalle entre deux rafraîchissements. 0 ou négatif = désactivé. */
  intervalMs: number;
  /** Si true, ne rafraîchit pas tant que l'onglet n'est pas visible. */
  visibilityAware?: boolean;
  /** Désactive proprement le rafraîchissement. */
  enabled?: boolean;
}

/**
 * Déclenche un `router.refresh()` à intervalle régulier.
 * Met le timer en pause quand l'onglet n'est pas visible (économie batterie + cohérence affichage).
 */
export function useAutoRefresh({
  intervalMs,
  visibilityAware = true,
  enabled = true
}: UseAutoRefreshOptions) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    function start() {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => router.refresh(), intervalMs);
    }
    function stop() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") start();
      else stop();
    }

    if (visibilityAware && typeof document !== "undefined") {
      if (document.visibilityState === "visible") start();
      document.addEventListener("visibilitychange", onVisibility);
    } else {
      start();
    }

    return () => {
      if (visibilityAware && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      stop();
    };
  }, [intervalMs, enabled, visibilityAware, router]);
}
