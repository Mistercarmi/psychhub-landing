"use client";

import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { KpiModulesData } from "@/server/modules-data.actions";
import { cn } from "@/lib/utils";

const propsSchema = z.object({
  label: z.string().min(1).default("Taux d'honoration")
});
type Props = z.infer<typeof propsSchema>;

function KpiTxHonorationComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useTabData<KpiModulesData>("kpi");
  const current = data?.tauxHonoration ?? 0;
  const previous = data?.previous?.tauxHonoration ?? null;
  const delta = previous !== null ? current - previous : null;
  const tone =
    delta === null
      ? "text-muted-foreground"
      : delta > 0.5
        ? "text-emerald-600 dark:text-emerald-400"
        : delta < -0.5
          ? "text-rose-600 dark:text-rose-400"
          : "text-muted-foreground";

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl">{current.toFixed(1)}%</CardTitle>
        {delta !== null ? (
          <p className={cn("text-xs", tone)}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)} pt vs période précédente
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Honorées / total sur la période. Activez la comparaison pour voir le delta.
          </p>
        )}
      </CardHeader>
    </Card>
  );
}

export const kpiTxHonorationModule: ModuleType<Props> = {
  key: "kpi-tx-honoration",
  name: "Taux d'honoration",
  description: "Part des séances honorées sur le total de la période",
  category: "KPI",
  icon: CheckCircle2,
  defaultSize: { w: 4, h: 2 },
  minSize: { w: 3, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "Taux d'honoration" },
  configSchema: propsSchema,
  component: KpiTxHonorationComponent,
  compatibleTabs: ["kpi", "dashboard"]
};
