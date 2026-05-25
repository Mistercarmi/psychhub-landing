"use client";

import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditModeToggle } from "@/editor/components/edit-mode-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useUiStore } from "@/stores/ui-store";

function todayFr() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export interface TopbarProps {
  title?: string;
  showEditorToggle?: boolean;
}

export function Topbar({ title, showEditorToggle = false }: TopbarProps) {
  const openPalette = useUiStore((s) => s.setCommandPaletteOpen);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="min-w-0">
        {title && <h1 className="text-lg font-semibold">{title}</h1>}
        <p className="text-xs capitalize text-muted-foreground">{todayFr()}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => openPalette(true)}
          aria-label="Recherche (Cmd+K)"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:inline">Rechercher</span>
          <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] font-medium md:inline">
            ⌘K
          </kbd>
        </Button>
        <ThemeToggle />
        {showEditorToggle && <EditModeToggle />}
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle séance</span>
        </Button>
      </div>
    </header>
  );
}
