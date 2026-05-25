"use client";

import { useMemo } from "react";
import { getModule } from "../registry/module-registry";
import "../registry/register-all";
import type { LayoutDefinition } from "../types";

export interface GridRendererProps {
  layout: LayoutDefinition;
}

export function GridRenderer({ layout }: GridRendererProps) {
  const { gridConfig, modules } = layout;

  const containerStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
      gridAutoRows: `${gridConfig.rowHeight}px`,
      gap: `${gridConfig.gap}px`
    }),
    [gridConfig.cols, gridConfig.rowHeight, gridConfig.gap]
  );

  return (
    <div className="grid w-full" style={containerStyle}>
      {modules
        .filter((m) => m.visible)
        .map((m) => {
          const def = getModule(m.type);
          if (!def) {
            return (
              <div
                key={m.id}
                className="flex items-center justify-center rounded-md border border-dashed border-destructive/50 bg-destructive/5 p-4 text-xs text-destructive"
                style={{
                  gridColumn: `${m.gridPosition.x + 1} / span ${m.gridPosition.w}`,
                  gridRow: `${m.gridPosition.y + 1} / span ${m.gridPosition.h}`
                }}
              >
                Module inconnu : {m.type}
              </div>
            );
          }
          const Component = def.component;
          return (
            <div
              key={m.id}
              style={{
                gridColumn: `${m.gridPosition.x + 1} / span ${m.gridPosition.w}`,
                gridRow: `${m.gridPosition.y + 1} / span ${m.gridPosition.h}`,
                minWidth: 0
              }}
            >
              <Component moduleId={m.id} props={m.props as any} isEditing={false} />
            </div>
          );
        })}
    </div>
  );
}
