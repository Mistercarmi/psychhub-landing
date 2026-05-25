"use client";

import { create } from "zustand";
import { temporal } from "zundo";
import { nanoid } from "nanoid";
import {
  DEFAULT_GRID_CONFIG,
  type GridConfig,
  type LayoutDefinition,
  type ModuleConfig,
  type ModuleType,
  type TabKey
} from "../types";
import { findNextAvailablePosition } from "../utils/grid-math";

export interface EditorState {
  editMode: boolean;
  currentTab: TabKey | null;
  layout: LayoutDefinition | null;
  dirty: boolean;
  isPaletteOpen: boolean;
  selectedModuleId: string | null;
  isSettingsOpen: boolean;

  setEditMode: (mode: boolean) => void;
  hydrate: (tab: TabKey, layout: LayoutDefinition) => void;
  setPaletteOpen: (open: boolean) => void;
  selectModule: (id: string | null) => void;
  openSettings: (id: string) => void;
  closeSettings: () => void;
  markClean: () => void;

  addModule: (type: ModuleType, opts?: { props?: Record<string, unknown> }) => string;
  removeModule: (id: string) => void;
  duplicateModule: (id: string) => string | null;
  updateModuleProps: (id: string, props: Record<string, unknown>) => void;
  updateModulePosition: (id: string, position: ModuleConfig["gridPosition"]) => void;
  applyGridChanges: (positions: Array<{ id: string; gridPosition: ModuleConfig["gridPosition"] }>) => void;
  setGridConfig: (grid: GridConfig) => void;
  resetTo: (layout: LayoutDefinition) => void;
}

function emptyLayout(tab: TabKey): LayoutDefinition {
  return {
    id: "",
    tabKey: tab,
    name: "Default",
    isDefault: true,
    modules: [],
    gridConfig: DEFAULT_GRID_CONFIG,
    schemaVersion: 1
  };
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      editMode: false,
      currentTab: null,
      layout: null,
      dirty: false,
      isPaletteOpen: false,
      selectedModuleId: null,
      isSettingsOpen: false,

      setEditMode: (mode) =>
        set({
          editMode: mode,
          isPaletteOpen: false,
          selectedModuleId: null,
          isSettingsOpen: false
        }),

      hydrate: (tab, layout) =>
        set({
          currentTab: tab,
          layout,
          dirty: false,
          selectedModuleId: null
        }),

      setPaletteOpen: (open) => set({ isPaletteOpen: open }),

      selectModule: (id) => set({ selectedModuleId: id }),

      openSettings: (id) =>
        set({ selectedModuleId: id, isSettingsOpen: true }),

      closeSettings: () => set({ isSettingsOpen: false }),

      markClean: () => set({ dirty: false }),

      addModule: (type, opts) => {
        const state = get();
        if (!state.layout) return "";
        const id = nanoid(10);
        const position = findNextAvailablePosition(
          state.layout.modules,
          state.layout.gridConfig,
          type.defaultSize
        );
        const newModule: ModuleConfig = {
          id,
          type: type.key,
          gridPosition: position,
          props: { ...type.defaultProps, ...(opts?.props ?? {}) },
          visible: true
        };
        set({
          layout: { ...state.layout, modules: [...state.layout.modules, newModule] },
          dirty: true,
          selectedModuleId: id
        });
        return id;
      },

      removeModule: (id) => {
        const state = get();
        if (!state.layout) return;
        set({
          layout: {
            ...state.layout,
            modules: state.layout.modules.filter((m) => m.id !== id)
          },
          dirty: true,
          selectedModuleId: state.selectedModuleId === id ? null : state.selectedModuleId,
          isSettingsOpen: state.selectedModuleId === id ? false : state.isSettingsOpen
        });
      },

      duplicateModule: (id) => {
        const state = get();
        if (!state.layout) return null;
        const src = state.layout.modules.find((m) => m.id === id);
        if (!src) return null;
        const newId = nanoid(10);
        const position = findNextAvailablePosition(
          state.layout.modules,
          state.layout.gridConfig,
          { w: src.gridPosition.w, h: src.gridPosition.h }
        );
        const copy: ModuleConfig = {
          ...src,
          id: newId,
          gridPosition: position,
          props: { ...src.props }
        };
        set({
          layout: { ...state.layout, modules: [...state.layout.modules, copy] },
          dirty: true,
          selectedModuleId: newId
        });
        return newId;
      },

      updateModuleProps: (id, props) => {
        const state = get();
        if (!state.layout) return;
        set({
          layout: {
            ...state.layout,
            modules: state.layout.modules.map((m) =>
              m.id === id ? { ...m, props: { ...m.props, ...props } } : m
            )
          },
          dirty: true
        });
      },

      updateModulePosition: (id, position) => {
        const state = get();
        if (!state.layout) return;
        set({
          layout: {
            ...state.layout,
            modules: state.layout.modules.map((m) =>
              m.id === id ? { ...m, gridPosition: position } : m
            )
          },
          dirty: true
        });
      },

      applyGridChanges: (positions) => {
        const state = get();
        if (!state.layout) return;
        const byId = new Map(positions.map((p) => [p.id, p.gridPosition]));
        let changed = false;
        const next = state.layout.modules.map((m) => {
          const np = byId.get(m.id);
          if (!np) return m;
          const cur = m.gridPosition;
          if (cur.x === np.x && cur.y === np.y && cur.w === np.w && cur.h === np.h) return m;
          changed = true;
          return { ...m, gridPosition: np };
        });
        if (!changed) return;
        set({ layout: { ...state.layout, modules: next }, dirty: true });
      },

      setGridConfig: (grid) => {
        const state = get();
        if (!state.layout) return;
        set({ layout: { ...state.layout, gridConfig: grid }, dirty: true });
      },

      resetTo: (layout) =>
        set({
          layout,
          dirty: false,
          selectedModuleId: null,
          isSettingsOpen: false
        })
    }),
    {
      limit: 50,
      partialize: (state: EditorState) =>
        ({ layout: state.layout }) as Pick<EditorState, "layout">,
      equality: (a: Pick<EditorState, "layout">, b: Pick<EditorState, "layout">) =>
        JSON.stringify(a.layout) === JSON.stringify(b.layout)
    } as never
  )
);

export { emptyLayout };
