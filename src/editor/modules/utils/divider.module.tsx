"use client";

import { Minus } from "lucide-react";
import { z } from "zod";
import type { ModuleType } from "@/editor/types";

const propsSchema = z.object({});
type Props = z.infer<typeof propsSchema>;

function DividerComponent() {
  return (
    <div className="flex h-full items-center px-2">
      <div className="h-px w-full bg-border" />
    </div>
  );
}

export const dividerModule: ModuleType<Props> = {
  key: "divider",
  name: "Séparateur",
  description: "Ligne horizontale de séparation",
  category: "Utils",
  icon: Minus,
  defaultSize: { w: 12, h: 1 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 12, h: 1 },
  defaultProps: {},
  configSchema: propsSchema,
  component: DividerComponent
};
