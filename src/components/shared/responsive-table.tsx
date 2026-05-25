"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface ResponsiveColumn<T> {
  key: string;
  label: string;
  cell: (row: T) => ReactNode;
  /** Valeur utilisée pour le tri client si `sortable` est activé sur la table. */
  sortValue?: (row: T) => string | number | Date | null | undefined;
  /** Permet de désactiver le tri sur cette colonne seulement (par défaut : suit `sortable` global). */
  sortable?: boolean;
  hideOnMobile?: boolean;
  align?: "left" | "right" | "center";
  /** Largeur CSS optionnelle (ex: "120px", "20%"). */
  width?: string;
}

export interface ResponsiveTableProps<T> {
  rows: T[];
  columns: ResponsiveColumn<T>[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  className?: string;
  /** Active le tri client (clic sur en-tête). Les colonnes doivent fournir `sortValue` pour être triables. */
  sortable?: boolean;
  /** Tri initial : `{ key, direction }`. */
  defaultSort?: { key: string; direction: Exclude<SortDirection, null> };
  /** Header collant en haut du conteneur scrollable. */
  stickyHeader?: boolean;
  /** Compact réduit le padding vertical. */
  density?: "comfortable" | "compact";
  /** Bloc d'action rendu en fin de ligne (desktop + mobile). */
  rowAction?: (row: T) => ReactNode;
  /** Classes CSS appliquées au container du tableau desktop (pour gérer overflow/maxHeight + stickyHeader). */
  desktopWrapperClassName?: string;
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "fr", { sensitivity: "base", numeric: true });
}

export function sortRows<T>(
  rows: T[],
  columns: ResponsiveColumn<T>[],
  sort: { key: string; direction: Exclude<SortDirection, null> } | null
): T[] {
  if (!sort) return rows;
  const col = columns.find((c) => c.key === sort.key);
  if (!col?.sortValue) return rows;
  const sorted = [...rows].sort((a, b) => compareValues(col.sortValue!(a), col.sortValue!(b)));
  return sort.direction === "asc" ? sorted : sorted.reverse();
}

export function ResponsiveTable<T>({
  rows,
  columns,
  rowKey,
  empty,
  className,
  sortable = false,
  defaultSort,
  stickyHeader = false,
  density = "comfortable",
  rowAction,
  desktopWrapperClassName
}: ResponsiveTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: Exclude<SortDirection, null> } | null>(
    defaultSort ?? null
  );

  const displayRows = useMemo(
    () => (sortable ? sortRows(rows, columns, sort) : rows),
    [sortable, rows, columns, sort]
  );

  if (displayRows.length === 0 && empty) {
    return <div className={className}>{empty}</div>;
  }

  const cellPad = density === "compact" ? "px-3 py-1.5" : "px-4 py-3";
  const headPad = density === "compact" ? "px-3 py-1.5" : "px-4 py-2";

  function toggleSort(colKey: string, colSortable: boolean) {
    if (!sortable || !colSortable) return;
    setSort((prev) => {
      if (!prev || prev.key !== colKey) return { key: colKey, direction: "asc" };
      if (prev.direction === "asc") return { key: colKey, direction: "desc" };
      return null;
    });
  }

  return (
    <div className={className}>
      {/* Desktop */}
      <div
        className={cn(
          "hidden md:block",
          stickyHeader && "max-h-[calc(100vh-16rem)] overflow-auto",
          desktopWrapperClassName
        )}
      >
        <table className="w-full text-sm">
          <thead className={cn(stickyHeader && "sticky top-0 z-10 bg-card")}>
            <tr className="border-b">
              {columns.map((c) => {
                const colSortable = sortable && (c.sortable ?? true) && Boolean(c.sortValue);
                const isSorted = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={cn(
                      "text-left font-medium text-muted-foreground",
                      headPad,
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      colSortable && "cursor-pointer select-none hover:text-foreground"
                    )}
                    onClick={() => toggleSort(c.key, c.sortable ?? true)}
                    aria-sort={
                      isSorted ? (sort!.direction === "asc" ? "ascending" : "descending") : "none"
                    }
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        c.align === "right" && "flex-row-reverse"
                      )}
                    >
                      {c.label}
                      {colSortable ? (
                        isSorted ? (
                          sort!.direction === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />
                        )
                      ) : null}
                    </span>
                  </th>
                );
              })}
              {rowAction ? <th className={cn("w-px", headPad)} aria-label="Actions" /> : null}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr key={rowKey(row)} className="border-b last:border-0 hover:bg-muted/30">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      cellPad,
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center"
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
                {rowAction ? (
                  <td className={cn(cellPad, "text-right")}>{rowAction(row)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {displayRows.map((row) => (
          <div key={rowKey(row)} className="rounded-lg border bg-card p-3 shadow-sm">
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((c) => (
                <div key={c.key} className="flex justify-between gap-3 py-1 text-sm">
                  <span className="font-medium text-muted-foreground">{c.label}</span>
                  <span className="min-w-0 text-right">{c.cell(row)}</span>
                </div>
              ))}
            {rowAction ? (
              <div className="mt-2 flex justify-end border-t pt-2">{rowAction(row)}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
