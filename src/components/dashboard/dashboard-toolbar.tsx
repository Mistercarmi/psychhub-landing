"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { useAutoRefresh } from "@/lib/hooks/use-auto-refresh";

export interface DashboardToolbarProps {
  /** Intervalle de refresh auto en minutes (0 = off). */
  autoRefreshMinutes?: number;
}

export function DashboardToolbar({ autoRefreshMinutes = 0 }: DashboardToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const compare = (params.get("compare") ?? "none") as "none" | "prev" | "yoy";

  useAutoRefresh({
    intervalMs: autoRefreshMinutes * 60_000,
    visibilityAware: true,
    enabled: autoRefreshMinutes > 0
  });

  function setCompare(v: string) {
    const next = new URLSearchParams(params.toString());
    if (v === "none") next.delete("compare");
    else next.set("compare", v);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  function refreshNow() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateRangePicker align="start" />
      <Select value={compare} onValueChange={setCompare}>
        <SelectTrigger className="h-9 w-[180px]" aria-label="Comparaison">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sans comparaison</SelectItem>
          <SelectItem value="prev">Période précédente</SelectItem>
          <SelectItem value="yoy">Année précédente (YoY)</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        onClick={refreshNow}
        disabled={isPending}
        aria-label="Rafraîchir maintenant"
        title="Rafraîchir maintenant"
      >
        <RefreshCw className={isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      </Button>
    </div>
  );
}
