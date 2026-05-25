"use client";

import { StickyNote } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleType } from "@/editor/types";

const propsSchema = z.object({
  titre: z.string().min(1).default("Note"),
  contenu: z.string().default("Cliquez sur l'icône paramètres pour modifier cette note."),
  couleur: z.enum(["default", "teal", "amber", "rose", "slate"]).default("default")
});
type Props = z.infer<typeof propsSchema>;

const colorClasses: Record<Props["couleur"], string> = {
  default: "",
  teal: "bg-teal-50 dark:bg-teal-950/30",
  amber: "bg-amber-50 dark:bg-amber-950/30",
  rose: "bg-rose-50 dark:bg-rose-950/30",
  slate: "bg-slate-100 dark:bg-slate-900/40"
};

function NoteLibreComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  return (
    <Card className={`flex h-full flex-col ${colorClasses[props.couleur]}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{props.titre}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto whitespace-pre-wrap text-sm text-foreground">
        {props.contenu}
      </CardContent>
    </Card>
  );
}

export const noteLibreModule: ModuleType<Props> = {
  key: "note-libre",
  name: "Note libre",
  description: "Bloc de texte libre (mémo, rappel, consigne)",
  category: "Utils",
  icon: StickyNote,
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 12 },
  defaultProps: { titre: "Note", contenu: "Cliquez sur l'icône paramètres pour modifier cette note.", couleur: "default" },
  configSchema: propsSchema,
  component: NoteLibreComponent
};
