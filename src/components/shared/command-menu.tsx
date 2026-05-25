"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Moon,
  Pencil,
  Plus,
  Receipt,
  Settings,
  Sun,
  Users
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from "@/components/ui/command";
import { useEditorStore } from "@/editor/store/editor-store";
import { globalSearch, type GlobalSearchResult } from "@/server/search.actions";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const editMode = useEditorStore((s) => s.editMode);
  const setEditMode = useEditorStore((s) => s.setEditMode);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const r = await globalSearch(q);
          setResults(r);
        } catch {
          setResults([]);
        }
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [query, open]);

  const close = () => onOpenChange(false);
  const go = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Rechercher une page, un patient, une facture..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isPending ? "Recherche..." : "Aucun résultat."}
        </CommandEmpty>

        {results.length > 0 && (
          <>
            <CommandGroup heading="Résultats">
              {results.map((r) => (
                <CommandItem
                  key={`${r.kind}-${r.id}`}
                  value={`${r.kind}-${r.label}-${r.id}`}
                  onSelect={() => go(r.href)}
                >
                  {r.kind === "patient" && <Users className="h-4 w-4 text-muted-foreground" />}
                  {r.kind === "seance" && <CalendarDays className="h-4 w-4 text-muted-foreground" />}
                  {r.kind === "facture" && <Receipt className="h-4 w-4 text-muted-foreground" />}
                  <span>{r.label}</span>
                  {r.subtitle && (
                    <span className="ml-auto text-xs text-muted-foreground">{r.subtitle}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/patients")}>
            <Users className="h-4 w-4" />
            <span>Patients</span>
            <CommandShortcut>G P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/seances")}>
            <CalendarDays className="h-4 w-4" />
            <span>Séances</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/factures")}>
            <Receipt className="h-4 w-4" />
            <span>Factures</span>
            <CommandShortcut>G F</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/kpi")}>
            <BarChart3 className="h-4 w-4" />
            <span>KPI</span>
            <CommandShortcut>G K</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/parametres")}>
            <Settings className="h-4 w-4" />
            <span>Paramètres</span>
            <CommandShortcut>G ,</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions rapides">
          <CommandItem
            onSelect={() => {
              close();
              setEditMode(!editMode);
            }}
          >
            <Pencil className="h-4 w-4" />
            <span>{editMode ? "Quitter le mode éditeur" : "Activer le mode éditeur"}</span>
            <CommandShortcut>E</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/seances/import")}>
            <Plus className="h-4 w-4" />
            <span>Importer des séances Doctolib</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Thème">
          <CommandItem
            onSelect={() => {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
              close();
            }}
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>
              Basculer en {resolvedTheme === "dark" ? "thème clair" : "thème sombre"}
            </span>
          </CommandItem>
          <CommandItem onSelect={() => { setTheme("system"); close(); }}>
            <span>Thème système</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
