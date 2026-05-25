"use client";

import { Users } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";
import { useDashboardData } from "@/editor/context/modules-data-context";

const propsSchema = z.object({
  label: z.string().min(1).default("Patients actifs")
});
type Props = z.infer<typeof propsSchema>;

function KpiPatientsActifsComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useDashboardData();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl">{data?.patientsActifs ?? 0}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export const kpiPatientsActifsModule: ModuleType<Props> = {
  key: "kpi-patients-actifs",
  name: "Patients actifs",
  description: "Nombre total de patients actifs",
  category: "KPI",
  icon: Users,
  defaultSize: { w: 3, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "Patients actifs" },
  configSchema: propsSchema,
  component: KpiPatientsActifsComponent,
  compatibleTabs: ["dashboard", "kpi"]
};
