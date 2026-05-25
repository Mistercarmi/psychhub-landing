"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ModuleType } from "@/editor/types";

const propsSchema = z.object({
  label: z.string().min(1).default("Nouvelle séance"),
  description: z.string().default(""),
  href: z.string().min(1).default("/seances")
});
type Props = z.infer<typeof propsSchema>;

function RaccourciActionComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  return (
    <Card className="flex h-full">
      <CardContent className="flex w-full flex-col items-start justify-center gap-2 p-4">
        <Button asChild variant="default" className="w-full">
          <Link href={props.href}>
            <Zap className="h-4 w-4" />
            {props.label}
          </Link>
        </Button>
        {props.description && (
          <p className="text-xs text-muted-foreground">{props.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export const raccourciActionModule: ModuleType<Props> = {
  key: "raccourci-action",
  name: "Raccourci",
  description: "Bouton de raccourci vers une page interne",
  category: "Utils",
  icon: Zap,
  defaultSize: { w: 3, h: 2 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 4 },
  defaultProps: { label: "Nouvelle séance", description: "", href: "/seances" },
  configSchema: propsSchema,
  component: RaccourciActionComponent
};
