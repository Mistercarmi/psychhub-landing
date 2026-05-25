import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <Skeleton className="mb-4 h-4 w-1/3" />
      <Skeleton className="mb-6 h-8 w-1/2" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="mb-3 h-4 w-full" />
      ))}
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <Skeleton className="mb-3 h-3 w-1/2" />
      <Skeleton className="h-9 w-2/3" />
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns,
  withAvatar = false
}: {
  rows?: number;
  /** Si fourni, dessine une grille à N colonnes (en-tête + corps). Sinon, layout legacy avec avatar. */
  columns?: number;
  withAvatar?: boolean;
}) {
  if (typeof columns === "number" && columns > 0) {
    const gridCols = `repeat(${columns}, minmax(0, 1fr))`;
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: gridCols }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`h-${i}`} className="h-4 w-3/4" />
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="grid gap-3" style={{ gridTemplateColumns: gridCols }}>
              {Array.from({ length: columns }).map((_, c) => (
                <Skeleton key={`r${r}-c${c}`} className="h-4" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            {withAvatar !== false ? <Skeleton className="h-9 w-9 rounded-full" /> : null}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
