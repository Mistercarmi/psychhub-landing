"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DayPicker, type DateRange as DPRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DATE_RANGE_PRESET_LABELS,
  type DateRange,
  type DateRangePreset,
  formatRangeLabel
} from "@/lib/date-range";
import { useDateRange } from "@/lib/hooks/use-date-range";
import { cn } from "@/lib/utils";

const PRESET_KEYS: Exclude<DateRangePreset, "custom">[] = [
  "today",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "lastYear",
  "last12Months"
];

export interface DateRangePickerProps {
  className?: string;
  align?: "start" | "center" | "end";
  /** Si fourni, surcharge le hook URL pour piloter le composant en local. */
  value?: DateRange | null;
  onChange?: (range: DateRange | null, preset: DateRangePreset) => void;
  /** Permet de cacher le bouton "clear" quand on veut forcer une plage. */
  clearable?: boolean;
  placeholder?: string;
}

export function DateRangePicker({
  className,
  align = "start",
  value,
  onChange,
  clearable = true,
  placeholder = "Toute la période"
}: DateRangePickerProps) {
  const hook = useDateRange();
  const [open, setOpen] = useState(false);

  // Mode contrôlé (via props) ou auto-URL (via hook)
  const isControlled = value !== undefined;
  const range = isControlled ? value ?? null : hook.range;
  const preset = isControlled ? "custom" : hook.preset;

  function applyRange(next: DateRange | null, nextPreset: DateRangePreset) {
    if (isControlled) onChange?.(next, nextPreset);
    else hook.setRange(next, nextPreset);
  }

  function applyPreset(p: DateRangePreset) {
    if (isControlled) {
      // En mode contrôlé, on délègue. Le helper resolveRange est dispo côté caller via use-date-range.
      // On émet onChange en laissant le caller calculer.
      onChange?.(null, p);
    } else {
      hook.setPreset(p);
    }
    setOpen(false);
  }

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">{range ? formatRangeLabel(range) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-auto p-0">
          <div className="flex flex-col gap-0 sm:flex-row">
            <div className="flex w-full flex-col gap-1 border-b p-2 sm:w-44 sm:border-b-0 sm:border-r">
              {PRESET_KEYS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent",
                    preset === p && "bg-accent font-medium"
                  )}
                >
                  {DATE_RANGE_PRESET_LABELS[p]}
                </button>
              ))}
            </div>
            <div className="p-2">
              <DayPicker
                mode="range"
                numberOfMonths={2}
                defaultMonth={range?.from}
                selected={
                  range ? ({ from: range.from, to: range.to } as DPRange) : undefined
                }
                onSelect={(sel: DPRange | undefined) => {
                  if (sel?.from && sel?.to) {
                    const from = new Date(sel.from);
                    from.setHours(0, 0, 0, 0);
                    const to = new Date(sel.to);
                    to.setHours(23, 59, 59, 999);
                    applyRange({ from, to }, "custom");
                  }
                }}
                weekStartsOn={1}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {clearable && range ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyRange(null, "custom")}
          aria-label="Réinitialiser la plage"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
