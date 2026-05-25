import type { GridConfig, GridPosition, ModuleConfig } from "../types";

export function findNextAvailablePosition(
  modules: ModuleConfig[],
  grid: GridConfig,
  size: { w: number; h: number }
): GridPosition {
  const cols = grid.cols;
  const occupancy = new Map<string, true>();
  for (const m of modules) {
    if (!m.visible) continue;
    for (let dx = 0; dx < m.gridPosition.w; dx++) {
      for (let dy = 0; dy < m.gridPosition.h; dy++) {
        occupancy.set(`${m.gridPosition.x + dx},${m.gridPosition.y + dy}`, true);
      }
    }
  }

  for (let y = 0; y < 200; y++) {
    for (let x = 0; x <= cols - size.w; x++) {
      let conflict = false;
      for (let dx = 0; dx < size.w && !conflict; dx++) {
        for (let dy = 0; dy < size.h && !conflict; dy++) {
          if (occupancy.has(`${x + dx},${y + dy}`)) conflict = true;
        }
      }
      if (!conflict) return { x, y, w: size.w, h: size.h };
    }
  }
  return { x: 0, y: 0, w: size.w, h: size.h };
}

export function clampSize(
  size: { w: number; h: number },
  grid: GridConfig,
  bounds: { min: { w: number; h: number }; max?: { w: number; h: number } }
): { w: number; h: number } {
  const maxW = bounds.max?.w ?? grid.cols;
  const maxH = bounds.max?.h ?? 20;
  return {
    w: Math.min(Math.max(size.w, bounds.min.w), maxW, grid.cols),
    h: Math.min(Math.max(size.h, bounds.min.h), maxH)
  };
}
