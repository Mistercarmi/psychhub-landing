"use client";

import dynamic from "next/dynamic";
import { Layers } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { KpiModulesData } from "@/server/modules-data.actions";

const CaSegmenteChart = dynamic(
  () => import("@/components/kpi/charts").then((m) => m.CaSegmenteChart),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse rounded-md bg-muted" /> }
);

const propsSchema = z.object({
  titre: z.string().min(1).default("CA mensuel — segmenté"),
  description: z.string().default("Empilé par segment actif (statut, durée)")
});
type Props = z.infer<typeof propsSchema>;

function ChartCaSegmenteComponent({
  props
}: {
  moduleId: string;
  props: Props;
  isEditing: boolean;
}) {
  const data = useTabData<KpiModulesData>("kpi");
  const seriesData = data?.caParMoisSegmente ?? [];
  const segments = data?.segments ?? [];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{props.titre}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {segments.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sélectionnez une segmentation dans la barre d&apos;outils KPI pour activer cette vue.
          </p>
        ) : (
          <CaSegmenteChart data={seriesData} segments={segments} />
        )}
      </CardContent>
    </Card>
  );
}

export const chartCaMensuelSegmenteModule: ModuleType<Props> = {
  key: "chart-ca-mensuel-segmente",
  name: "CA mensuel segmenté",
  description: "BarChart empilé par segment (statut, durée)",
  category: "Charts",
  icon: Layers,
  defaultSize: { w: 8, h: 5 },
  minSize: { w: 4, h: 4 },
  maxSize: { w: 12, h: 10 },
  defaultProps: {
    titre: "CA mensuel — segmenté",
    description: "Empilé par segment actif (statut, durée)"
  },
  configSchema: propsSchema,
  component: ChartCaSegmenteComponent,
  compatibleTabs: ["kpi"]
};
