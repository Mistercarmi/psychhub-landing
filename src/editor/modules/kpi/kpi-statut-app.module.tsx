"use client";

import { ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ModuleType } from "@/editor/types";

const propsSchema = z.object({
  label: z.string().min(1).default("Statut"),
  message: z.string().min(1).default("Local · sécurisé")
});
type Props = z.infer<typeof propsSchema>;

function KpiStatutAppComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-base">
          <Badge variant="secondary">{props.message}</Badge>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export const kpiStatutAppModule: ModuleType<Props> = {
  key: "kpi-statut-app",
  name: "Statut application",
  description: "Indicateur de statut de l'application (texte libre)",
  category: "KPI",
  icon: ShieldCheck,
  defaultSize: { w: 3, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "Statut", message: "Local · sécurisé" },
  configSchema: propsSchema,
  component: KpiStatutAppComponent
};
