"use client";

import { Euro } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuros } from "@/lib/utils";
import type { ModuleType } from "@/editor/types";
import { useDashboardData } from "@/editor/context/modules-data-context";

const propsSchema = z.object({
  label: z.string().min(1).default("CA du mois")
});
type Props = z.infer<typeof propsSchema>;

function KpiCaMoisComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useDashboardData();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl">{formatEuros(data?.caMois ?? 0)}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export const kpiCaMoisModule: ModuleType<Props> = {
  key: "kpi-ca-mois",
  name: "CA du mois",
  description: "Chiffre d'affaires du mois en cours",
  category: "KPI",
  icon: Euro,
  defaultSize: { w: 3, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "CA du mois" },
  configSchema: propsSchema,
  component: KpiCaMoisComponent,
  compatibleTabs: ["dashboard", "kpi"]
};
