"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, type ReactNode } from "react";
import { GridRenderer } from "@/editor/components/grid-renderer";
import { ModulePalette } from "@/editor/components/module-palette";
import { ModuleSettingsDrawer } from "@/editor/components/module-settings-drawer";
import { EditorToolbar } from "@/editor/components/editor-toolbar";
import { useEditorStore } from "@/editor/store/editor-store";
import { useAutosaveLayout } from "@/editor/hooks/use-autosave-layout";
import { useKeyboardShortcuts } from "@/editor/hooks/use-keyboard-shortcuts";
import { useContainerWidth } from "@/editor/hooks/use-container-width";
import { getDefaultLayout } from "@/editor/utils/layout-defaults";
import type { LayoutDefinition, TabKey } from "@/editor/types";
import "@/editor/registry/register-all";

const EditorCanvas = dynamic(
  () => import("@/editor/components/editor-canvas").then((m) => m.EditorCanvas),
  { ssr: false }
);

export interface PageWithEditorProps {
  tabKey: TabKey;
  initialLayout: LayoutDefinition | null;
  fallback: ReactNode;
}

export function PageWithEditor({ tabKey, initialLayout, fallback }: PageWithEditorProps) {
  const editMode = useEditorStore((s) => s.editMode);
  const layout = useEditorStore((s) => s.layout);
  const hydrate = useEditorStore((s) => s.hydrate);
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);

  useEffect(() => {
    hydrate(tabKey, initialLayout ?? getDefaultLayout(tabKey));
  }, [tabKey, initialLayout, hydrate]);

  useAutosaveLayout(tabKey);
  useKeyboardShortcuts(tabKey);

  const hasCustomLayout = Boolean(initialLayout);

  if (!editMode && !hasCustomLayout) {
    return <>{fallback}</>;
  }

  if (!layout) {
    return <>{fallback}</>;
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {editMode ? <EditorCanvas width={width} /> : <GridRenderer layout={layout} />}

      <ModulePalette tab={tabKey} />
      <ModuleSettingsDrawer />
      <EditorToolbar tab={tabKey} />
    </div>
  );
}
