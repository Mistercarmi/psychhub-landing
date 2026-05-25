"use client";

import { Copy, GripVertical, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorStore } from "../store/editor-store";
import { getModule } from "../registry/module-registry";
import type { ModuleConfig } from "../types";

export interface ModuleWrapperProps {
  module: ModuleConfig;
}

export function ModuleWrapper({ module }: ModuleWrapperProps) {
  const editMode = useEditorStore((s) => s.editMode);
  const selectedId = useEditorStore((s) => s.selectedModuleId);
  const selectModule = useEditorStore((s) => s.selectModule);
  const openSettings = useEditorStore((s) => s.openSettings);
  const removeModule = useEditorStore((s) => s.removeModule);
  const duplicateModule = useEditorStore((s) => s.duplicateModule);

  const def = getModule(module.type);
  const isSelected = selectedId === module.id;

  if (!def) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-dashed border-destructive/50 bg-destructive/5 p-4 text-xs text-destructive">
        Module inconnu : {module.type}
      </div>
    );
  }

  const Component = def.component;

  return (
    <div
      className={cn(
        "group relative h-full w-full",
        editMode && "rounded-xl outline-2 outline-transparent transition-all",
        editMode && isSelected && "outline outline-primary",
        editMode && !isSelected && "hover:outline-dashed hover:outline-primary/40"
      )}
      onClick={(e) => {
        if (!editMode) return;
        e.stopPropagation();
        selectModule(module.id);
      }}
    >
      <Component moduleId={module.id} props={module.props as any} isEditing={editMode} />

      {editMode && (
        <>
          <div className="module-drag-handle absolute left-2 top-2 z-10 flex h-6 cursor-grab items-center gap-1 rounded-md bg-primary px-2 text-[10px] font-medium uppercase tracking-wide text-primary-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            <GripVertical className="h-3 w-3" />
            Déplacer
          </div>

          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="icon"
              variant="secondary"
              className="h-6 w-6"
              title="Paramètres du module"
              onClick={(e) => {
                e.stopPropagation();
                openSettings(module.id);
              }}
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-6 w-6"
              title="Dupliquer"
              onClick={(e) => {
                e.stopPropagation();
                duplicateModule(module.id);
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-6 w-6"
              title="Supprimer"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Supprimer ce module ?")) removeModule(module.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
