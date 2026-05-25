"use client";

import { useEffect, useState, type RefObject } from "react";

export function useContainerWidth(ref: RefObject<HTMLElement>, fallback = 1200): number {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.clientWidth);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) setWidth(w);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
