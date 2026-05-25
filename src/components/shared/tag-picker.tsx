"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Tag as TagIcon, X } from "lucide-react";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createTag } from "@/server/tags.actions";
import { cn } from "@/lib/utils";

export interface TagOption {
  id: string;
  name: string;
  color?: string | null;
}

export interface TagPickerProps {
  /** Tags disponibles côté serveur. */
  options: TagOption[];
  /** IDs sélectionnés (mode contrôlé). */
  value: string[];
  onChange: (next: string[]) => void;
  /** Si true, propose la création inline depuis l'input. */
  allowCreate?: boolean;
  placeholder?: string;
  triggerLabel?: string;
  className?: string;
}

export function TagPicker({
  options,
  value,
  onChange,
  allowCreate = true,
  placeholder = "Rechercher un tag…",
  triggerLabel = "Tags",
  className
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const selected = options.filter((t) => value.includes(t.id));
  const filtered = options.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  const canCreate =
    allowCreate &&
    search.trim().length > 0 &&
    !options.some((t) => t.name.toLowerCase() === search.trim().toLowerCase());

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  }

  function handleCreate() {
    const name = search.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        const created = await createTag({ name });
        toast.success(`Tag "${created.name}" créé`);
        onChange([...value, created.id]);
        setSearch("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur création tag");
      }
    });
  }

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <TagIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {triggerLabel}
            {selected.length > 0 ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {selected.length}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {canCreate ? (
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Créer &quot;{search.trim()}&quot;
                  </button>
                ) : (
                  <span className="block px-2 py-1.5 text-xs text-muted-foreground">
                    Aucun tag.
                  </span>
                )}
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((t) => {
                  const checked = value.includes(t.id);
                  return (
                    <CommandItem
                      key={t.id}
                      value={t.name}
                      onSelect={() => toggle(t.id)}
                      className="gap-2"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border",
                          checked && "border-primary bg-primary text-primary-foreground"
                        )}
                      >
                        {checked ? <Check className="h-3 w-3" /> : null}
                      </span>
                      {t.color ? (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: t.color }}
                          aria-hidden="true"
                        />
                      ) : null}
                      {t.name}
                    </CommandItem>
                  );
                })}
                {canCreate && filtered.length > 0 ? (
                  <CommandItem onSelect={handleCreate} className="gap-2 text-primary">
                    <Plus className="h-3.5 w-3.5" />
                    Créer &quot;{search.trim()}&quot;
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.map((t) => (
        <Badge
          key={t.id}
          variant="secondary"
          className="gap-1"
          style={t.color ? { borderColor: t.color } : undefined}
        >
          {t.color ? (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: t.color }}
              aria-hidden="true"
            />
          ) : null}
          {t.name}
          <button
            type="button"
            onClick={() => toggle(t.id)}
            aria-label={`Retirer ${t.name}`}
            className="ml-0.5 rounded-sm hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
