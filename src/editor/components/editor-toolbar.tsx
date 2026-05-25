"use client";

import { useState, useTransition } from "react";
import { Download, Plus, RotateCcw, Save, Undo2, Redo2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useEditorStore } from "../store/editor-store";
import { useTemporalStore } from "../store/use-temporal-store";
import { exportLayout, importLayout, resetLayout, saveLayout } from "@/server/layouts.actions";
import { getDefaultLayout } from "../utils/layout-defaults";
import type { TabKey } from "../types";

export interface EditorToolbarProps {
  tab: TabKey;
}

export function EditorToolbar({ tab }: EditorToolbarProps) {
  const editMode = useEditorStore((s) => s.editMode);
  const dirty = useEditorStore((s) => s.dirty);
  const layout = useEditorStore((s) => s.layout);
  const setPaletteOpen = useEditorStore((s) => s.setPaletteOpen);
  const isPaletteOpen = useEditorStore((s) => s.isPaletteOpen);
  const resetTo = useEditorStore((s) => s.resetTo);
  const markClean = useEditorStore((s) => s.markClean);

  const { undo, redo, pastStates, futureStates } = useTemporalStore();

  const [isPending, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);

  if (!editMode || !layout) return null;

  const handleSave = () => {
    startTransition(async () => {
      try {
        await saveLayout({
          tabKey: tab,
          modules: layout.modules,
          gridConfig: layout.gridConfig
        });
        markClean();
        toast.success("Layout sauvegardé");
      } catch (e) {
        toast.error("Erreur lors de la sauvegarde", {
          description: e instanceof Error ? e.message : undefined
        });
      }
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      try {
        await resetLayout(tab);
        const fresh = getDefaultLayout(tab);
        resetTo(fresh);
        toast.success("Layout réinitialisé");
      } catch (e) {
        toast.error("Erreur lors de la réinitialisation", {
          description: e instanceof Error ? e.message : undefined
        });
      } finally {
        setResetOpen(false);
      }
    });
  };

  const handleExport = async () => {
    try {
      const json = await exportLayout(tab);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `psychhub-layout-${tab}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Layout exporté");
    } catch (e) {
      toast.error("Aucun layout à exporter pour l'instant. Sauvegardez d'abord.");
    }
  };

  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      startTransition(async () => {
        try {
          const imported = await importLayout(text, tab);
          resetTo(imported);
          toast.success("Layout importé");
        } catch (e) {
          toast.error("Import impossible", {
            description: e instanceof Error ? e.message : undefined
          });
        }
      });
    };
    input.click();
  };

  return (
    <>
      <div
        className={cn(
          "pointer-events-auto fixed bottom-6 left-1/2 z-30 -translate-x-1/2",
          "flex items-center gap-1 rounded-full border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur"
        )}
      >
        <Button
          size="sm"
          variant={isPaletteOpen ? "default" : "ghost"}
          onClick={() => setPaletteOpen(!isPaletteOpen)}
          className="gap-1"
          data-palette-trigger
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>

        <div className="mx-1 h-5 w-px bg-border" />

        <Button
          size="icon"
          variant="ghost"
          onClick={() => undo()}
          disabled={pastStates.length === 0}
          title="Annuler (Cmd/Ctrl+Z)"
          aria-label="Annuler"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => redo()}
          disabled={futureStates.length === 0}
          title="Refaire (Cmd/Ctrl+Shift+Z)"
          aria-label="Refaire"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-5 w-px bg-border" />

        <Button
          size="icon"
          variant="ghost"
          onClick={handleExport}
          title="Exporter le layout en JSON"
          aria-label="Exporter"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleImportClick}
          title="Importer un layout JSON"
          aria-label="Importer"
        >
          <Upload className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setResetOpen(true)}
          title="Réinitialiser au layout par défaut"
          aria-label="Réinitialiser"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-5 w-px bg-border" />

        <Button
          size="sm"
          variant={dirty ? "default" : "outline"}
          onClick={handleSave}
          disabled={!dirty || isPending}
          className="gap-1"
          title="Sauvegarder (Cmd/Ctrl+S)"
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">{dirty ? "Sauvegarder" : "À jour"}</span>
        </Button>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser ce layout ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes vos personnalisations pour l&apos;onglet « {tab} » seront perdues. Le layout
              par défaut sera restauré. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Réinitialiser</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
