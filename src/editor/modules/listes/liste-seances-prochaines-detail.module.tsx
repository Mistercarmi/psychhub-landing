"use client";

import { CalendarCheck } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/utils";
import { getStatutVisual } from "@/lib/seance-colors";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { SeancesModulesData } from "@/server/modules-data.actions";

const propsSchema = z.object({
  titre: z.string().min(1).default("Prochaines séances (tous statuts)"),
  limit: z.number().int().min(1).max(20).default(10)
});
type Props = z.infer<typeof propsSchema>;

function Component({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useTabData<SeancesModulesData>("seances");
  const items = (data?.prochaines ?? []).slice(0, props.limit);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle>{props.titre}</CardTitle>
        <CardDescription>Tous statuts confondus</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune séance à venir.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((s) => {
              const visual = getStatutVisual(s.statut);
              return (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">
                      {s.patientPrenom} {s.patientNom}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.date).toLocaleString("fr-FR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{formatEuros(s.tarif)}</Badge>
                    <Badge variant="outline" className={visual.badgeClass}>
                      {visual.label}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export const listeSeancesProchainesDetailModule: ModuleType<Props> = {
  key: "liste-seances-prochaines-detail",
  name: "Prochaines séances (détail)",
  description: "Liste détaillée des séances à venir tous statuts",
  category: "Listes",
  icon: CalendarCheck,
  defaultSize: { w: 8, h: 5 },
  minSize: { w: 4, h: 3 },
  maxSize: { w: 12, h: 12 },
  defaultProps: { titre: "Prochaines séances (tous statuts)", limit: 10 },
  configSchema: propsSchema,
  component: Component,
  compatibleTabs: ["seances", "dashboard"]
};
