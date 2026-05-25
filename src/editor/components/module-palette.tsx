"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEditorStore } from "../store/editor-store";
import { getModulesForTab } from "../registry/module-registry";
import "../registry/register-all";
import { MODULE_CATEGORIES, type ModuleCategory, type TabKey } from "../types";

const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  KPI: "KPI",
  Charts: "Graphiques",
  Tables: "Tableaux",
  Listes: "Listes",
  Utils: "Utilitaires"
};

export interface ModulePaletteProps {
  tab: TabKey;
}

export function ModulePalette({ tab }: ModulePaletteProps) {
  const isPaletteOpen = useEditorStore((s) => s.isPaletteOpen);
  const setPaletteOpen = useEditorStore((s) => s.setPaletteOpen);
  const addModule = useEditorStore((s) => s.addModule);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const modules = useMemo(() => {
    const all = getModulesForTab(tab);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    );
  }, [tab, query]);

  const grouped = useMemo(() => {
    const out: Record<ModuleCategory, typeof modules> = {
      KPI: [],
      Charts: [],
      Tables: [],
      Listes: [],
      Utils: []
    };
    for (const m of modules) out[m.category].push(m);
    return out;
  }, [modules]);

  // Click outside fermeture
  useEffect(() => {
    if (!isPaletteOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-palette]")) return;
      if (target.closest("[data-palette-trigger]")) return;
      setPaletteOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isPaletteOpen, setPaletteOpen]);

  // Reset recherche à chaque ouverture
  useEffect(() => {
    if (isPaletteOpen) setQuery("");
  }, [isPaletteOpen]);

  if (!isPaletteOpen) return null;

  return (
    <div
      ref={containerRef}
      data-palette
      className={cn(
        "fixed bottom-24 left-1/2 z-40 flex w-[min(440px,calc(100vw-32px))] -translate-x-1/2 flex-col rounded-xl border bg-card shadow-2xl",
        "max-h-[min(520px,calc(100vh-180px))]",
        "animate-in slide-in-from-bottom-4 fade-in duration-150"
      )}
      role="dialog"
      aria-label="Palette de modules"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Ajouter un module</div>
          <div className="text-xs text-muted-foreground">
            Cliquez pour l&apos;insérer sur la grille
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPaletteOpen(false)}
          aria-label="Fermer la palette"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un module..."
            className="pl-8"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {MODULE_CATEGORIES.map((cat) => {
          const items = grouped[cat];
          if (!items.length) return null;
          return (
            <div key={cat}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {items.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        addModule(m);
                        // Conserver la palette ouverte pour ajouter plusieurs modules à la suite
                      }}
                      className={cn(
                        "group flex items-start gap-2 rounded-md border border-transparent p-2 text-left text-sm",
                        "transition-colors hover:border-border hover:bg-accent"
                      )}
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{m.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {m.description}
                        </span>
                      </span>
                      <Plus className="mt-1 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {modules.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Aucun module ne correspond à votre recherche.
          </p>
        )}
      </div>
    </div>
  );
}
