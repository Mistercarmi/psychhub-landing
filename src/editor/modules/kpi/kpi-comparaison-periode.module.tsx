"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuros, cn } from "@/lib/utils";
import type { ModuleType } from "@/editor/types";
import { useDashboardData } from "@/editor/context/modules-data-context";

const propsSchema = z.object({
  label: z.string().min(1).default("Comparaison période"),
  /** Métrique à comparer. */
  metric: z.enum(["caPeriode", "seancesHonoreesPeriode", "patientsActifs"]).default("caPeriode")
});
type Props = z.infer<typeof propsSchema>;

function formatValue(metric: Props["metric"], v: number) {
  if (metric === "caPeriode") return formatEuros(v);
  return v.toString();
}

function metricLabel(metric: Props["metric"]) {
  switch (metric) {
    case "caPeriode":
      return "CA période";
    case "seancesHonoreesPeriode":
      return "Séances honorées";
    case "patientsActifs":
      return "Patients actifs";
  }
}

function KpiComparaisonPeriodeComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useDashboardData();
  const current = data ? (data[props.metric] as number) : 0;
  const previous = data?.previous ? (data.previous[props.metric] as number) : null;

  let delta: number | null = null;
  let pct: number | null = null;
  if (previous !== null) {
    delta = current - previous;
    pct = previous !== 0 ? (delta / previous) * 100 : current > 0 ? 100 : 0;
  }

  const trend: "up" | "down" | "flat" = delta === null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const colorClass =
    trend === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : trend === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label || metricLabel(props.metric)}</CardDescription>
        <CardTitle className="text-3xl">{formatValue(props.metric, current)}</CardTitle>
        {previous !== null ? (
          <div className={cn("flex items-center gap-1 text-xs", colorClass)}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {delta !== null && delta >= 0 ? "+" : ""}
              {formatValue(props.metric, delta ?? 0)}
            </span>
            {pct !== null ? (
              <span className="opacity-80">
                ({pct >= 0 ? "+" : ""}
                {pct.toFixed(1)}%)
              </span>
            ) : null}
            <span className="ml-1 text-muted-foreground">vs période précédente</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Activez la comparaison pour voir la variation.
          </p>
        )}
      </CardHeader>
    </Card>
  );
}

export const kpiComparaisonPeriodeModule: ModuleType<Props> = {
  key: "kpi-comparaison-periode",
  name: "Comparaison période",
  description: "Variation vs période précédente ou année précédente",
  category: "KPI",
  icon: TrendingUp,
  defaultSize: { w: 4, h: 2 },
  minSize: { w: 3, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "Comparaison période", metric: "caPeriode" },
  configSchema: propsSchema,
  component: KpiComparaisonPeriodeComponent,
  compatibleTabs: ["dashboard", "kpi"]
};
