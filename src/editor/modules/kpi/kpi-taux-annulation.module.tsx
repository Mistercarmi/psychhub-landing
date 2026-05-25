"use client";

import { Percent } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { KpiModulesData } from "@/server/modules-data.actions";

const propsSchema = z.object({
  label: z.string().min(1).default("Taux d'annulation moyen")
});
type Props = z.infer<typeof propsSchema>;

function KpiTauxAnnulationComponent({
  props
}: {
  moduleId: string;
  props: Props;
  isEditing: boolean;
}) {
  const data = useTabData<KpiModulesData>("kpi");
  const value = ((data?.tauxAnnulMoyen ?? 0) * 100).toFixed(1);
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl">{value}%</CardTitle>
      </CardHeader>
    </Card>
  );
}

export const kpiTauxAnnulationModule: ModuleType<Props> = {
  key: "kpi-taux-annulation",
  name: "Taux d'annulation",
  description: "Pourcentage moyen d'annulations sur l'année",
  category: "KPI",
  icon: Percent,
  defaultSize: { w: 4, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "Taux d'annulation moyen" },
  configSchema: propsSchema,
  component: KpiTauxAnnulationComponent,
  compatibleTabs: ["kpi", "dashboard"]
};
