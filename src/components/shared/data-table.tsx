"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResponsiveTable,
  type ResponsiveColumn,
  type SortDirection
} from "@/components/shared/responsive-table";
import { cn } from "@/lib/utils";

export interface DataTableProps<T> {
  rows: T[];
  columns: ResponsiveColumn<T>[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  className?: string;
  sortable?: boolean;
  defaultSort?: { key: string; direction: Exclude<SortDirection, null> };
  /** Pagination client. Mettre `null` pour désactiver. Défaut: 25. */
  pageSize?: number | null;
  /** Sélection multiple via checkbox en première colonne. */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  stickyHeader?: boolean;
  density?: "comfortable" | "compact";
  rowAction?: (row: T) => ReactNode;
  /** Barre d'action affichée quand au moins une ligne est sélectionnée. */
  bulkBar?: (selected: T[], clear: () => void) => ReactNode;
}

/**
 * Composition: ResponsiveTable (rendu + tri client visuel) + pagination + sélection multiple.
 * Le tri visuel est porté par ResponsiveTable ; la pagination opère sur l'ordre d'entrée des `rows`.
 * Pour aligner pagination et tri, trier `rows` en amont si besoin via `sortRows`.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  empty,
  className,
  sortable = true,
  defaultSort,
  pageSize = 25,
  selectable = false,
  selectedIds,
  onSelectionChange,
  stickyHeader = false,
  density = "comfortable",
  rowAction,
  bulkBar
}: DataTableProps<T>) {
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const selection = selectedIds ?? internalSelected;
  const setSelection = (next: string[]) => {
    if (onSelectionChange) onSelectionChange(next);
    else setInternalSelected(next);
  };

  const [page, setPage] = useState(0);
  const totalPages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = pageSize ? rows.slice(safePage * pageSize, (safePage + 1) * pageSize) : rows;
  const visibleIds = useMemo(() => pageRows.map(rowKey), [pageRows, rowKey]);

  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selection.includes(id));
  const someSelected = !allSelected && visibleIds.some((id) => selection.includes(id));

  function toggleAll() {
    if (allSelected) setSelection(selection.filter((id) => !visibleIds.includes(id)));
    else setSelection(Array.from(new Set([...selection, ...visibleIds])));
  }

  function toggleOne(id: string) {
    if (selection.includes(id)) setSelection(selection.filter((x) => x !== id));
    else setSelection([...selection, id]);
  }

  const finalColumns: ResponsiveColumn<T>[] = selectable
    ? [
        {
          key: "__select",
          label: "",
          sortable: false,
          width: "40px",
          hideOnMobile: false,
          cell: (row: T) => (
            <Checkbox
              checked={selection.includes(rowKey(row))}
              onCheckedChange={() => toggleOne(rowKey(row))}
              aria-label="Sélectionner la ligne"
              onClick={(e) => e.stopPropagation()}
            />
          )
        },
        ...columns
      ]
    : columns;

  const selectedObjects = rows.filter((r) => selection.includes(rowKey(r)));

  return (
    <div className={cn("space-y-2", className)}>
      {selectable && selectedObjects.length > 0 && bulkBar ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          {bulkBar(selectedObjects, () => setSelection([]))}
        </div>
      ) : null}

      {selectable ? (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={toggleAll}
            aria-label="Tout sélectionner sur la page"
          />
          <span>
            {selection.length > 0 ? `${selection.length} sélectionné(s)` : "Sélection multiple"}
          </span>
        </div>
      ) : null}

      <ResponsiveTable
        rows={pageRows}
        columns={finalColumns}
        rowKey={rowKey}
        empty={empty}
        sortable={sortable}
        defaultSort={defaultSort}
        stickyHeader={stickyHeader}
        density={density}
        rowAction={rowAction}
      />

      {pageSize && totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
          <span>
            Page {safePage + 1} / {totalPages} · {rows.length} ligne{rows.length > 1 ? "s" : ""}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
