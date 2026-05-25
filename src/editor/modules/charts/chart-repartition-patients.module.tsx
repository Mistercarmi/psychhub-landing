"use client";

import dynamic from "next/dynamic";
import { PieChart } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { KpiModulesData } from "@/server/modules-data.actions";

const RepartitionPatientsChart = dynamic(
  () => import("@/components/kpi/charts").then((m) => m.RepartitionPatientsChart),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse rounded-md bg-muted" /> }
);

const propsSchema = z.object({
  titre: z.string().min(1).default("Répartition par patient"),
  description: z.string().default("Top 5 + autres")
});
type Props = z.infer<typeof propsSchema>;

function ChartRepartitionPatientsComponent({
  props
}: {
  moduleId: string;
  props: Props;
  isEditing: boolean;
}) {
  const data = useTabData<KpiModulesData>("kpi");
  const top = data?.top ?? [];
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{props.titre}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {top.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Pas encore de données.
          </p>
        ) : (
          <RepartitionPatientsChart data={top} />
        )}
      </CardContent>
    </Card>
  );
}

export const chartRepartitionPatientsModule: ModuleType<Props> = {
  key: "chart-repartition-patients",
  name: "Répartition patients",
  description: "Camembert de la répartition du CA par patient",
  category: "Charts",
  icon: PieChart,
  defaultSize: { w: 6, h: 5 },
  minSize: { w: 4, h: 4 },
  maxSize: { w: 12, h: 10 },
  defaultProps: { titre: "Répartition par patient", description: "Top 5 + autres" },
  configSchema: propsSchema,
  component: ChartRepartitionPatientsComponent,
  compatibleTabs: ["kpi", "dashboard"]
};
