"use client";

import Link from "next/link";
import { Cake } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ModuleType } from "@/editor/types";
import { useTabData } from "@/editor/context/modules-data-context";
import type { PatientsModulesData } from "@/server/modules-data.actions";

const propsSchema = z.object({
  titre: z.string().min(1).default("Anniversaires à venir"),
  limit: z.number().int().min(1).max(20).default(5)
});
type Props = z.infer<typeof propsSchema>;

function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function daysUntilBirthday(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next = new Date(now.getFullYear() + 1, d.getMonth(), d.getDate());
  }
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function Component({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const data = useTabData<PatientsModulesData>("patients");
  const items = (data?.prochainsAnniversaires ?? []).slice(0, props.limit);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle>{props.titre}</CardTitle>
        <CardDescription>Patients actifs · 60 prochains jours</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun anniversaire à venir.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((p) => {
              const days = daysUntilBirthday(p.dateNaissance);
              return (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/patients/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.prenom} {p.nom}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {ageFromDob(p.dateNaissance) + 1} ans dans{" "}
                      {days === 0 ? "aujourd'hui" : `${days} j`}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {new Date(p.dateNaissance).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short"
                    })}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export const listeAnniversairesModule: ModuleType<Props> = {
  key: "liste-anniversaires",
  name: "Anniversaires patients",
  description: "Prochains anniversaires des patients actifs",
  category: "Listes",
  icon: Cake,
  defaultSize: { w: 6, h: 5 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 12, h: 12 },
  defaultProps: { titre: "Anniversaires à venir", limit: 5 },
  configSchema: propsSchema,
  component: Component,
  compatibleTabs: ["patients", "dashboard"]
};
