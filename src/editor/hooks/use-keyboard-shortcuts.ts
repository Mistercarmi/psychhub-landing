"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useEditorStore } from "../store/editor-store";
import { useTemporalStore } from "../store/use-temporal-store";
import { saveLayout } from "@/server/layouts.actions";
import type { TabKey } from "../types";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(tab: TabKey) {
  const editMode = useEditorStore((s) => s.editMode);
  const setEditMode = useEditorStore((s) => s.setEditMode);
  const layout = useEditorStore((s) => s.layout);
  const dirty = useEditorStore((s) => s.dirty);
  const markClean = useEditorStore((s) => s.markClean);
  const closeSettings = useEditorStore((s) => s.closeSettings);
  const isSettingsOpen = useEditorStore((s) => s.isSettingsOpen);

  const { undo, redo } = useTemporalStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "s" && editMode) {
        e.preventDefault();
        if (layout && dirty) {
          saveLayout({ tabKey: tab, modules: layout.modules, gridConfig: layout.gridConfig })
            .then(() => {
              markClean();
              toast.success("Layout sauvegardé");
            })
            .catch((err) => {
              toast.error("Sauvegarde impossible", {
                description: err instanceof Error ? err.message : undefined
              });
            });
        }
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === "z" && editMode) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "z" && editMode) {
        e.preventDefault();
        undo();
        return;
      }

      if (e.key === "Escape") {
        if (isSettingsOpen) {
          closeSettings();
          return;
        }
        if (editMode) {
          setEditMode(false);
          return;
        }
      }

      if (!isTypingTarget(e.target) && !mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setEditMode(!editMode);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, dirty, layout, tab, markClean, setEditMode, closeSettings, isSettingsOpen, undo, redo]);
}
