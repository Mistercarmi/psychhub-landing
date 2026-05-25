"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagPicker, type TagOption } from "@/components/shared/tag-picker";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface PatientsFiltersProps {
  tags: TagOption[];
  className?: string;
}

export function PatientsFilters({ tags, className }: PatientsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const q = params.get("q") ?? "";
  const actifParam = params.get("actif");
  const actif: "all" | "true" | "false" =
    actifParam === "true" ? "true" : actifParam === "false" ? "false" : "all";
  const tagIds = (params.get("tags") ?? "").split(",").filter(Boolean);

  function update(mutator: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutator(next);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  function setTags(ids: string[]) {
    update((p) => {
      if (ids.length === 0) p.delete("tags");
      else p.set("tags", ids.join(","));
    });
  }

  function setActif(v: "all" | "true" | "false") {
    update((p) => {
      if (v === "all") p.delete("actif");
      else p.set("actif", v);
    });
  }

  function setQ(value: string) {
    update((p) => {
      if (value) p.set("q", value);
      else p.delete("q");
    });
  }

  function reset() {
    update((p) => {
      p.delete("q");
      p.delete("actif");
      p.delete("tags");
      p.delete("from");
      p.delete("to");
      p.delete("preset");
    });
  }

  const activeFilters =
    (q ? 1 : 0) + (actif !== "all" ? 1 : 0) + (tagIds.length > 0 ? 1 : 0) + (params.get("from") ? 1 : 0);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, prénom, email…"
          defaultValue={q}
          className="pl-9"
          onChange={(e) => setQ(e.target.value)}
          aria-label="Rechercher un patient"
        />
      </div>

      <Select value={actif} onValueChange={(v) => setActif(v as never)}>
        <SelectTrigger className="h-9 w-[180px]" aria-label="Filtrer par statut">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Actifs et inactifs</SelectItem>
          <SelectItem value="true">Patients actifs seulement</SelectItem>
          <SelectItem value="false">Patients inactifs seulement</SelectItem>
        </SelectContent>
      </Select>

      <TagPicker options={tags} value={tagIds} onChange={setTags} triggerLabel="Étiquettes" />

      <DateRangePicker align="start" />

      {activeFilters > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="gap-1"
          title="Retirer tous les filtres"
        >
          <X className="h-4 w-4" />
          Tout effacer
          <Badge variant="secondary" className="ml-1 h-5 px-1.5">
            {activeFilters}
          </Badge>
        </Button>
      ) : (
        <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filtres
        </span>
      )}
    </div>
  );
}
