"use client";

import { CalendarRange } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";
import { useDashboardData } from "@/editor/context/modules-data-context";
import { getStatutVisual } from "@/lib/seance-colors";
import { cn } from "@/lib/utils";

const propsSchema = z.object({
  titre: z.string().min(1).default("Cette semaine"),
  description: z.string().default("Aperçu compact des séances de la semaine")
});
type Props = z.infer<typeof propsSchema>;

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

function CalendrierSemaineComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useDashboardData();
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Filtre les prochaines séances dans la semaine courante
  const items = (data?.prochainesSeances ?? [])
    .map((s) => ({ ...s, dateObj: new Date(s.date) }))
    .filter((s) => {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 7);
      return s.dateObj >= weekStart && s.dateObj < end;
    });

  const byDay = new Map<number, typeof items>();
  for (const it of items) {
    const idx = (it.dateObj.getDay() + 6) % 7;
    const arr = byDay.get(idx) ?? [];
    arr.push(it);
    byDay.set(idx, arr);
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle>{props.titre}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 gap-1 text-xs">
          {days.map((d, i) => {
            const isToday =
              d.getFullYear() === now.getFullYear() &&
              d.getMonth() === now.getMonth() &&
              d.getDate() === now.getDate();
            return (
              <div
                key={i}
                className={cn(
                  "rounded-md border bg-card/40 p-1",
                  isToday && "border-primary bg-accent/40"
                )}
              >
                <div className={cn("mb-1 text-center text-[10px]", isToday && "font-medium text-primary")}>
                  <div>{WEEKDAYS[i]}</div>
                  <div className="text-muted-foreground">{d.getDate()}</div>
                </div>
                <div className="space-y-0.5">
                  {(byDay.get(i) ?? []).slice(0, 4).map((s) => {
                    const v = getStatutVisual(s.statut ?? "PLANIFIEE");
                    const time = s.dateObj.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    });
                    return (
                      <div
                        key={s.id}
                        className={cn("truncate rounded px-1 py-0.5 text-[10px] leading-tight", v.badgeClass)}
                        title={`${time} · ${s.patientPrenom} ${s.patientNom}`}
                      >
                        <span className="font-mono opacity-80">{time}</span>{" "}
                        {s.patientPrenom[0]}. {s.patientNom}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {items.length === 0 ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Aucune séance cette semaine.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export const calendrierSemaineModule: ModuleType<Props> = {
  key: "calendrier-semaine",
  name: "Calendrier de la semaine",
  description: "Aperçu compact des séances de la semaine en cours",
  category: "Listes",
  icon: CalendarRange,
  defaultSize: { w: 12, h: 4 },
  minSize: { w: 6, h: 3 },
  maxSize: { w: 12, h: 8 },
  defaultProps: {
    titre: "Cette semaine",
    description: "Aperçu compact des séances de la semaine"
  },
  configSchema: propsSchema,
  component: CalendrierSemaineComponent,
  compatibleTabs: ["dashboard", "seances"]
};
