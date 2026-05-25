"use client";

import { UserMinus } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { PatientsModulesData } from "@/server/modules-data.actions";

const propsSchema = z.object({
  label: z.string().min(1).default("Patients inactifs")
});
type Props = z.infer<typeof propsSchema>;

function Component({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useTabData<PatientsModulesData>("patients");
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl">{data?.totalInactifs ?? 0}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export const kpiPatientsInactifsModule: ModuleType<Props> = {
  key: "kpi-patients-inactifs",
  name: "Patients inactifs",
  description: "Nombre total de patients inactifs",
  category: "KPI",
  icon: UserMinus,
  defaultSize: { w: 3, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "Patients inactifs" },
  configSchema: propsSchema,
  component: Component,
  compatibleTabs: ["patients"]
};
