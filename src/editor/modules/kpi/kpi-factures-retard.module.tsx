"use client";

import { AlertCircle } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";
import { useDashboardData } from "@/editor/context/modules-data-context";

const propsSchema = z.object({
  label: z.string().min(1).default("Factures en retard")
});
type Props = z.infer<typeof propsSchema>;

function KpiFacturesRetardComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useDashboardData();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl">{data?.facturesEnRetard ?? 0}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export const kpiFacturesRetardModule: ModuleType<Props> = {
  key: "kpi-factures-retard",
  name: "Factures en retard",
  description: "Nombre de factures impayées en retard",
  category: "KPI",
  icon: AlertCircle,
  defaultSize: { w: 3, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "Factures en retard" },
  configSchema: propsSchema,
  component: KpiFacturesRetardComponent,
  compatibleTabs: ["dashboard", "factures"]
};
