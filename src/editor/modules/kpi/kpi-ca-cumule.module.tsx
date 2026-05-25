"use client";

import { TrendingUp } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuros } from "@/lib/utils";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { KpiModulesData } from "@/server/modules-data.actions";

const propsSchema = z.object({
  label: z.string().min(1).default("CA cumulé (année)")
});
type Props = z.infer<typeof propsSchema>;

function KpiCaCumuleComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useTabData<KpiModulesData>("kpi");
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl">{formatEuros(data?.caTotal ?? 0)}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export const kpiCaCumuleModule: ModuleType<Props> = {
  key: "kpi-ca-cumule",
  name: "CA cumulé année",
  description: "Chiffre d'affaires cumulé depuis le 1er janvier",
  category: "KPI",
  icon: TrendingUp,
  defaultSize: { w: 4, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "CA cumulé (année)" },
  configSchema: propsSchema,
  component: KpiCaCumuleComponent,
  compatibleTabs: ["kpi", "dashboard"]
};
