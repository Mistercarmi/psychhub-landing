"use client";

import { Receipt } from "lucide-react";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuros } from "@/lib/utils";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { FacturesModulesData } from "@/server/modules-data.actions";

const propsSchema = z.object({
  label: z.string().min(1).default("Total impayé"),
  afficherMontant: z.boolean().default(true)
});
type Props = z.infer<typeof propsSchema>;

function Component({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useTabData<FacturesModulesData>("factures");
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-3xl">
          {props.afficherMontant ? formatEuros(data?.montantImpaye ?? 0) : (data?.totalImpayees ?? 0)}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export const kpiFacturesImpayeesModule: ModuleType<Props> = {
  key: "kpi-factures-impayees",
  name: "Factures impayées",
  description: "Total des factures non payées (montant ou compte)",
  category: "KPI",
  icon: Receipt,
  defaultSize: { w: 3, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "Total impayé", afficherMontant: true },
  configSchema: propsSchema,
  component: Component,
  compatibleTabs: ["factures", "dashboard"]
};
