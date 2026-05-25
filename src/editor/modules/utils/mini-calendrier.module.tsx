"use client";

import { CalendarDays } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";

const propsSchema = z.object({
  titre: z.string().min(1).default("Calendrier")
});
type Props = z.infer<typeof propsSchema>;

function MiniCalendrierComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay + 6) % 7;
  const cells: Array<number | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base capitalize">
          {props.titre} — {monthLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <div key={`${d}-${i}`} className="font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((c, i) => (
            <div
              key={i}
              className={`rounded p-1 ${
                c === today
                  ? "bg-primary font-bold text-primary-foreground"
                  : c
                    ? "hover:bg-accent"
                    : ""
              }`}
            >
              {c ?? ""}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export const miniCalendrierModule: ModuleType<Props> = {
  key: "mini-calendrier",
  name: "Mini calendrier",
  description: "Calendrier du mois en cours",
  category: "Utils",
  icon: CalendarDays,
  defaultSize: { w: 4, h: 4 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 12, h: 8 },
  defaultProps: { titre: "Calendrier" },
  configSchema: propsSchema,
  component: MiniCalendrierComponent
};
