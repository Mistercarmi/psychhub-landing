"use client";

import { useStore } from "zustand";
import { useEditorStore } from "./editor-store";

function getTemporal() {
  return (useEditorStore as any).temporal;
}

export function useTemporalStore() {
  const temporal = getTemporal();
  const pastStates = useStore(temporal, (s: any) => s.pastStates as unknown[]);
  const futureStates = useStore(temporal, (s: any) => s.futureStates as unknown[]);
  const undo = useStore(temporal, (s: any) => s.undo as (steps?: number) => void);
  const redo = useStore(temporal, (s: any) => s.redo as (steps?: number) => void);
  const clear = useStore(temporal, (s: any) => s.clear as () => void);
  return { pastStates, futureStates, undo, redo, clear };
}
