"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandMenu } from "./command-menu";
import { useUiStore } from "@/stores/ui-store";

const NAV_KEYS: Record<string, string> = {
  d: "/dashboard",
  p: "/patients",
  s: "/seances",
  f: "/factures",
  k: "/kpi",
  ",": "/parametres"
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function GlobalShortcuts() {
  const router = useRouter();
  const paletteOpen = useUiStore((s) => s.commandPaletteOpen);
  const setPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette);
  const [awaitingG, setAwaitingG] = useState(false);

  useEffect(() => {
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      if (isTypingTarget(e.target)) return;
      if (mod || e.altKey) return;

      if (awaitingG) {
        const target = NAV_KEYS[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          router.push(target);
        }
        setAwaitingG(false);
        if (gTimer) clearTimeout(gTimer);
        return;
      }

      if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        setAwaitingG(true);
        gTimer = setTimeout(() => setAwaitingG(false), 1500);
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [awaitingG, router, toggleCommandPalette]);

  return <CommandMenu open={paletteOpen} onOpenChange={setPaletteOpen} />;
}
