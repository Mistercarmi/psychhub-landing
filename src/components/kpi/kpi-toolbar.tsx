"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/shared/date-range-picker";

export function KpiToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const compare = (params.get("compare") ?? "none") as "none" | "prev" | "yoy";
  const segment = (params.get("segment") ?? "none") as "none" | "statut" | "duree";

  function setParam(key: string, value: string, defaultValue: string) {
    const next = new URLSearchParams(params.toString());
    if (value === defaultValue) next.delete(key);
    else next.set(key, value);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateRangePicker align="start" />
      <Select value={compare} onValueChange={(v) => setParam("compare", v, "none")}>
        <SelectTrigger className="h-9 w-[180px]" aria-label="Comparaison">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sans comparaison</SelectItem>
          <SelectItem value="prev">Période précédente</SelectItem>
          <SelectItem value="yoy">Année précédente (YoY)</SelectItem>
        </SelectContent>
      </Select>
      <Select value={segment} onValueChange={(v) => setParam("segment", v, "none")}>
        <SelectTrigger className="h-9 w-[170px]" aria-label="Segmentation">
          <Layers className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Aucune segmentation</SelectItem>
          <SelectItem value="statut">Par statut</SelectItem>
          <SelectItem value="duree">Par durée</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
