"use client";

import dynamic from "next/dynamic";
import { BarChart3 } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { KpiModulesData } from "@/server/modules-data.actions";
import { ChartFrame } from "@/components/kpi/chart-frame";
import { AlertBanner } from "@/components/shared/alert-banner";
import { formatEuros } from "@/lib/utils";

const CaParMoisChart = dynamic(
  () => import("@/components/kpi/charts").then((m) => m.CaParMoisChart),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse rounded-md bg-muted" /> }
);

const propsSchema = z.object({
  titre: z.string().min(1).default("Chiffre d'affaires par mois"),
  description: z.string().default("Séances honorées uniquement"),
  /** Si défini, une alerte s'affiche quand le CA du dernier mois est sous ce seuil. */
  thresholdMin: z.coerce.number().nonnegative().optional()
});
type Props = z.infer<typeof propsSchema>;

function ChartCaMoisComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useTabData<KpiModulesData>("kpi");
  const series = data?.caParMois ?? [];
  const lastValue = series.length > 0 ? series[series.length - 1].ca : 0;
  const lastMois = series.length > 0 ? series[series.length - 1].mois : "";
  const showAlert =
    typeof props.thresholdMin === "number" && props.thresholdMin > 0 && lastValue < props.thresholdMin;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{props.titre}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {showAlert ? (
          <AlertBanner
            level="warning"
            title={`CA de ${lastMois} sous le seuil`}
            description={
              <>
                {formatEuros(lastValue)} &lt; seuil {formatEuros(props.thresholdMin ?? 0)}
              </>
            }
          />
        ) : null}
        <ChartFrame
          title={props.titre}
          filenameBase="ca-par-mois"
          data={series}
          csvFields={[
            { key: "mois", header: "Mois", value: (r) => r.mois },
            { key: "ca", header: "CA (€)", value: (r) => r.ca }
          ]}
        >
          <CaParMoisChart data={series} />
        </ChartFrame>
      </CardContent>
    </Card>
  );
}

export const chartCaMoisModule: ModuleType<Props> = {
  key: "chart-ca-mois",
  name: "CA par mois",
  description: "Graphique barre du chiffre d'affaires mensuel + alerte seuil + export",
  category: "Charts",
  icon: BarChart3,
  defaultSize: { w: 6, h: 5 },
  minSize: { w: 4, h: 4 },
  maxSize: { w: 12, h: 10 },
  defaultProps: {
    titre: "Chiffre d'affaires par mois",
    description: "Séances honorées uniquement"
  },
  configSchema: propsSchema,
  component: ChartCaMoisComponent,
  compatibleTabs: ["kpi", "dashboard"]
};
