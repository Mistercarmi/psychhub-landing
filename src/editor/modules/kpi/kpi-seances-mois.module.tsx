"use client";

import { CalendarClock } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { SeancesModulesData } from "@/server/modules-data.actions";

const propsSchema = z.object({
  label: z.string().min(1).default("Séances ce mois")
});
type Props = z.infer<typeof propsSchema>;

function Component({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useTabData<SeancesModulesData>("seances");
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl">{data?.totalMois ?? 0}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export const kpiSeancesMoisModule: ModuleType<Props> = {
  key: "kpi-seances-mois",
  name: "Séances ce mois",
  description: "Nombre total de séances ce mois (tous statuts)",
  category: "KPI",
  icon: CalendarClock,
  defaultSize: { w: 3, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "Séances ce mois" },
  configSchema: propsSchema,
  component: Component,
  compatibleTabs: ["seances", "dashboard"]
};
