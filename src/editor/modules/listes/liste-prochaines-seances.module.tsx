"use client";

import { CalendarClock } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/utils";
import type { ModuleType } from "@/editor/types";
import { useDashboardData } from "@/editor/context/modules-data-context";

const propsSchema = z.object({
  titre: z.string().min(1).default("Prochaines séances"),
  description: z.string().min(1).default("Les prochains rendez-vous planifiés"),
  limit: z.number().int().min(1).max(20).default(5)
});
type Props = z.infer<typeof propsSchema>;

function ListeProchainesSeancesComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useDashboardData();
  const items = (data?.prochainesSeances ?? []).slice(0, props.limit);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle>{props.titre}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune séance planifiée.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((s) => (
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
                <Badge variant="outline">{formatEuros(s.tarif)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export const listeProchainesSeancesModule: ModuleType<Props> = {
  key: "liste-prochaines-seances",
  name: "Prochaines séances",
  description: "Liste des prochains rendez-vous",
  category: "Listes",
  icon: CalendarClock,
  defaultSize: { w: 12, h: 5 },
  minSize: { w: 4, h: 3 },
  maxSize: { w: 12, h: 12 },
  defaultProps: { titre: "Prochaines séances", description: "Les prochains rendez-vous planifiés", limit: 5 },
  configSchema: propsSchema,
  component: ListeProchainesSeancesComponent,
  compatibleTabs: ["dashboard", "seances"]
};
