"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateFr, formatEuros } from "@/lib/utils";
import {
  factureStatutLabel,
  factureStatutVariant
} from "@/lib/factures/statut-labels";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { FacturesModulesData } from "@/server/modules-data.actions";

const propsSchema = z.object({
  titre: z.string().min(1).default("Factures récentes"),
  limit: z.number().int().min(1).max(20).default(5)
});
type Props = z.infer<typeof propsSchema>;

function Component({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useTabData<FacturesModulesData>("factures");
  const items = (data?.recentes ?? []).slice(0, props.limit);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle>{props.titre}</CardTitle>
        <CardDescription>Les {props.limit} dernières factures émises</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune facture.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    href={`/factures/${f.id}`}
                    className="font-medium hover:underline"
                  >
                    {f.numero} · {f.patientPrenom} {f.patientNom}
                  </Link>
                  <div className="text-xs text-muted-foreground">{formatDateFr(f.dateEmission)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatEuros(f.montantTTC)}</span>
                  <Badge variant={factureStatutVariant(f.statut)}>
                    {factureStatutLabel(f.statut)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export const listeFacturesRecentesModule: ModuleType<Props> = {
  key: "liste-factures-recentes",
  name: "Factures récentes",
  description: "Liste des dernières factures émises",
  category: "Listes",
  icon: Receipt,
  defaultSize: { w: 6, h: 5 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 12, h: 12 },
  defaultProps: { titre: "Factures récentes", limit: 5 },
  configSchema: propsSchema,
  component: Component,
  compatibleTabs: ["factures", "dashboard"]
};
