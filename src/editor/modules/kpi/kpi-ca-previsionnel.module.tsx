"use client";

import { Calendar } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuros } from "@/lib/utils";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { KpiModulesData } from "@/server/modules-data.actions";

const propsSchema = z.object({
  label: z.string().min(1).default("CA prévisionnel (planifié)")
});
type Props = z.infer<typeof propsSchema>;

function KpiCaPrevisionnelComponent({
  props
}: {
  moduleId: string;
  props: Props;
  isEditing: boolean;
}) {
  const data = useTabData<KpiModulesData>("kpi");
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl">{formatEuros(data?.caPrevisionnel ?? 0)}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export const kpiCaPrevisionnelModule: ModuleType<Props> = {
  key: "kpi-ca-previsionnel",
  name: "CA prévisionnel",
  description: "Chiffre d'affaires des séances planifiées",
  category: "KPI",
  icon: Calendar,
  defaultSize: { w: 4, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "CA prévisionnel (planifié)" },
  configSchema: propsSchema,
  component: KpiCaPrevisionnelComponent,
  compatibleTabs: ["kpi", "dashboard"]
};
