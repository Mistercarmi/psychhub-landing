"use client";

import dynamic from "next/dynamic";

/**
 * Wrappers `next/dynamic({ ssr: false })` autour des graphiques recharts pour respecter
 * la règle CLAUDE.md (lazy-load recharts). L'implémentation est dans `charts-impl.tsx`
 * et n'est chargée qu'au montage côté client — économise ~120 KB sur les pages qui
 * n'affichent pas de graphique.
 */

const ChartFallback = () => (
  <div className="h-[260px] w-full animate-pulse rounded bg-muted/40" aria-hidden />
);

export const CaParMoisChart = dynamic(
  () => import("./charts-impl").then((m) => ({ default: m.CaParMoisChart })),
  { ssr: false, loading: ChartFallback }
);

export const RepartitionPatientsChart = dynamic(
  () => import("./charts-impl").then((m) => ({ default: m.RepartitionPatientsChart })),
  { ssr: false, loading: ChartFallback }
);

export const CaSegmenteChart = dynamic(
  () => import("./charts-impl").then((m) => ({ default: m.CaSegmenteChart })),
  { ssr: false, loading: ChartFallback }
);

export const AnnulationsChart = dynamic(
  () => import("./charts-impl").then((m) => ({ default: m.AnnulationsChart })),
  { ssr: false, loading: ChartFallback }
);
