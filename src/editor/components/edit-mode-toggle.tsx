"use client";

import { Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorStore } from "../store/editor-store";

export function EditModeToggle() {
  const editMode = useEditorStore((s) => s.editMode);
  const dirty = useEditorStore((s) => s.dirty);
  const setEditMode = useEditorStore((s) => s.setEditMode);

  return (
    <Button
      size="sm"
      variant={editMode ? "default" : "outline"}
      onClick={() => setEditMode(!editMode)}
      className={cn("gap-2", dirty && "relative")}
      title={editMode ? "Quitter le mode éditeur" : "Activer le mode éditeur (E)"}
    >
      {editMode ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
      {editMode ? "Quitter l'édition" : "Éditer"}
      {dirty && (
        <span
          className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background"
          aria-label="Modifications non sauvegardées"
        />
      )}
    </Button>
  );
}
