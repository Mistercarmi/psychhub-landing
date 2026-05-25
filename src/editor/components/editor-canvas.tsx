"use client";

import { useCallback, useMemo } from "react";
import GridLayout, { type Layout as RGLLayoutItem } from "react-grid-layout";
import { useEditorStore } from "../store/editor-store";
import { getModule } from "../registry/module-registry";
import "../registry/register-all";
import { ModuleWrapper } from "./module-wrapper";
import type { ModuleConfig } from "../types";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./editor-canvas.css";

const DEFAULT_WIDTH = 1200;

export interface EditorCanvasProps {
  width?: number;
}

export function EditorCanvas({ width = DEFAULT_WIDTH }: EditorCanvasProps) {
  const layout = useEditorStore((s) => s.layout);
  const applyGridChanges = useEditorStore((s) => s.applyGridChanges);

  const rglLayout: RGLLayoutItem[] = useMemo(() => {
    if (!layout) return [];
    return layout.modules
      .filter((m) => m.visible)
      .map((m) => {
        const def = getModule(m.type);
        return {
          i: m.id,
          x: m.gridPosition.x,
          y: m.gridPosition.y,
          w: m.gridPosition.w,
          h: m.gridPosition.h,
          minW: def?.minSize.w ?? 1,
          minH: def?.minSize.h ?? 1,
          maxW: def?.maxSize?.w,
          maxH: def?.maxSize?.h
        };
      });
  }, [layout]);

  const handleStop = useCallback(
    (next: RGLLayoutItem[]) => {
      if (!layout) return;
      applyGridChanges(
        next.map((item) => ({
          id: item.i,
          gridPosition: { x: item.x, y: item.y, w: item.w, h: item.h }
        }))
      );
    },
    [applyGridChanges, layout]
  );

  if (!layout) return null;

  return (
    <GridLayout
      className="editor-canvas"
      layout={rglLayout}
      cols={layout.gridConfig.cols}
      rowHeight={layout.gridConfig.rowHeight}
      width={width}
      margin={[layout.gridConfig.gap, layout.gridConfig.gap]}
      containerPadding={[0, 0]}
      compactType={layout.gridConfig.compactType}
      draggableHandle=".module-drag-handle"
      isResizable
      isDraggable
      onDragStop={handleStop}
      onResizeStop={handleStop}
      resizeHandles={["se"]}
    >
      {layout.modules
        .filter((m: ModuleConfig) => m.visible)
        .map((m) => (
          <div key={m.id} className="overflow-hidden">
            <ModuleWrapper module={m} />
          </div>
        ))}
    </GridLayout>
  );
}
