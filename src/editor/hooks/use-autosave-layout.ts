"use client";

import { useEffect, useMemo, useRef } from "react";
import debounce from "lodash.debounce";
import { useEditorStore } from "../store/editor-store";
import { saveLayout } from "@/server/layouts.actions";
import type { TabKey } from "../types";

export function useAutosaveLayout(tab: TabKey, opts: { debounceMs?: number; enabled?: boolean } = {}) {
  const { debounceMs = 2000, enabled = true } = opts;
  const layout = useEditorStore((s) => s.layout);
  const editMode = useEditorStore((s) => s.editMode);
  const dirty = useEditorStore((s) => s.dirty);
  const markClean = useEditorStore((s) => s.markClean);

  const lastSerialized = useRef<string | null>(null);

  const debouncedSave = useMemo(
    () =>
      debounce(async (modules: unknown, gridConfig: unknown) => {
        try {
          await saveLayout({
            tabKey: tab,
            modules: modules as any,
            gridConfig: gridConfig as any
          });
          markClean();
        } catch (e) {
          if (process.env.NODE_ENV === "development") {
            console.error("[autosave] failed:", e);
          }
        }
      }, debounceMs),
    [tab, debounceMs, markClean]
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  useEffect(() => {
    if (!enabled || !editMode || !dirty || !layout) return;
    const serialized = JSON.stringify({ m: layout.modules, g: layout.gridConfig });
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;
    debouncedSave(layout.modules, layout.gridConfig);
  }, [enabled, editMode, dirty, layout, debouncedSave]);
}
