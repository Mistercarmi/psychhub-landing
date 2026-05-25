"use client";

import dynamic from "next/dynamic";
import { TrendingDown } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { KpiModulesData } from "@/server/modules-data.actions";

const AnnulationsChart = dynamic(
  () => import("@/components/kpi/charts").then((m) => m.AnnulationsChart),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse rounded-md bg-muted" /> }
);

const propsSchema = z.object({
  titre: z.string().min(1).default("Taux d'annulation par mois"),
  description: z.string().default("Annulations patient/praticien + absences")
});
type Props = z.infer<typeof propsSchema>;

function ChartAnnulationsComponent({
  props
}: {
  moduleId: string;
  props: Props;
  isEditing: boolean;
}) {
  const data = useTabData<KpiModulesData>("kpi");
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{props.titre}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <AnnulationsChart data={data?.annulations ?? []} />
      </CardContent>
    </Card>
  );
}

export const chartAnnulationsModule: ModuleType<Props> = {
  key: "chart-annulations",
  name: "Taux d'annulation",
  description: "Courbe du taux d'annulation par mois",
  category: "Charts",
  icon: TrendingDown,
  defaultSize: { w: 12, h: 5 },
  minSize: { w: 4, h: 4 },
  maxSize: { w: 12, h: 10 },
  defaultProps: {
    titre: "Taux d'annulation par mois",
    description: "Annulations patient/praticien + absences"
  },
  configSchema: propsSchema,
  component: ChartAnnulationsComponent,
  compatibleTabs: ["kpi"]
};
