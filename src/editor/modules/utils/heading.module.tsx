"use client";

import { Heading as HeadingIcon } from "lucide-react";
import { z } from "zod";
import type { ModuleType } from "@/editor/types";

const propsSchema = z.object({
  texte: z.string().min(1).default("Titre de section"),
  niveau: z.enum(["h1", "h2", "h3"]).default("h2")
});
type Props = z.infer<typeof propsSchema>;

const sizeClasses: Record<Props["niveau"], string> = {
  h1: "text-3xl font-bold",
  h2: "text-xl font-semibold",
  h3: "text-base font-medium"
};

function HeadingComponent({ props }: { moduleId: string; props: Props; isEditing: boolean }) {
  const Tag = props.niveau;
  return (
    <div className="flex h-full items-center px-2">
      <Tag className={`${sizeClasses[props.niveau]} text-foreground`}>{props.texte}</Tag>
    </div>
  );
}

export const headingModule: ModuleType<Props> = {
  key: "heading",
  name: "Titre",
  description: "Titre de section pour structurer le layout",
  category: "Utils",
  icon: HeadingIcon,
  defaultSize: { w: 12, h: 1 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 12, h: 2 },
  defaultProps: { texte: "Titre de section", niveau: "h2" },
  configSchema: propsSchema,
  component: HeadingComponent
};
