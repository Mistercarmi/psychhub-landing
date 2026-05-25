"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { cn, formatDateTimeFr } from "@/lib/utils";
import { getStatutVisual } from "@/lib/seance-colors";
import { rescheduleSeance } from "@/server/seances.actions";

export type CalendarViewMode = "day" | "week" | "month";

export interface CalendarSeance {
  id: string;
  date: string; // ISO
  dureeMinutes: number;
  statut: string;
  patientPrenom: string;
  patientNom: string;
  tarif: number;
}

export interface CalendarViewProps {
  seances: CalendarSeance[];
  /** Date courante (centrage de la vue). Défaut: aujourd'hui. */
  initialDate?: Date;
  initialView?: CalendarViewMode;
}

const FRENCH_WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const FRENCH_MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre"
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // 0 = lundi
  x.setDate(x.getDate() - dow);
  return x;
}
function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmtDateUrl(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarView({ seances, initialDate, initialView = "week" }: CalendarViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const dateParam = params.get("date");
  const currentDate = useMemo(() => {
    if (dateParam) {
      const d = new Date(`${dateParam}T12:00:00`);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return initialDate ?? new Date();
  }, [dateParam, initialDate]);

  const view = (params.get("view") as CalendarViewMode | null) ?? initialView;

  function navigate(deltaDays: number) {
    const next =
      view === "month" ? addMonths(currentDate, deltaDays > 0 ? 1 : -1) : addDays(currentDate, deltaDays);
    const p = new URLSearchParams(params.toString());
    p.set("date", fmtDateUrl(next));
    startTransition(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  }
  function goToday() {
    const p = new URLSearchParams(params.toString());
    p.delete("date");
    startTransition(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  }
  function setView(v: CalendarViewMode | "list") {
    const p = new URLSearchParams(params.toString());
    p.set("view", v);
    startTransition(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  }

  // Indexation des séances par jour pour O(1) lookup
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarSeance[]>();
    for (const s of seances) {
      const d = new Date(s.date);
      const key = fmtDateUrl(d);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
    return map;
  }, [seances]);

  async function handleDrop(seanceId: string, newDate: Date, preserveTime = true) {
    const orig = seances.find((s) => s.id === seanceId);
    if (!orig) return;
    const target = new Date(newDate);
    if (preserveTime) {
      const original = new Date(orig.date);
      target.setHours(original.getHours(), original.getMinutes(), 0, 0);
    }
    try {
      await rescheduleSeance(seanceId, target);
      toast.success(`Séance déplacée au ${formatDateTimeFr(target)}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du déplacement");
    }
  }

  const headerLabel =
    view === "month"
      ? `${FRENCH_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : view === "week"
        ? (() => {
            const start = startOfWeekMonday(currentDate);
            const end = addDays(start, 6);
            return `Semaine du ${start.getDate()} ${FRENCH_MONTHS[start.getMonth()]} au ${end.getDate()} ${FRENCH_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
          })()
        : currentDate.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
          });

  return (
    <Card className="p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Précédent">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Suivant">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium capitalize">{headerLabel}</span>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as CalendarViewMode)}>
          <TabsList>
            <TabsTrigger value="day">Jour</TabsTrigger>
            <TabsTrigger value="week">Semaine</TabsTrigger>
            <TabsTrigger value="month">Mois</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="ghost" size="sm" onClick={() => setView("list" as never)}>
          Vue liste
        </Button>
      </div>

      {view === "month" ? (
        <MonthGrid date={currentDate} byDay={byDay} onDrop={handleDrop} />
      ) : view === "week" ? (
        <WeekGrid date={currentDate} byDay={byDay} onDrop={handleDrop} />
      ) : (
        <DayGrid date={currentDate} seances={byDay.get(fmtDateUrl(currentDate)) ?? []} onDrop={handleDrop} />
      )}
    </Card>
  );
}

// ---------- Helpers visuels ----------

function SeanceChip({
  seance,
  draggable = true,
  compact = false
}: {
  seance: CalendarSeance;
  draggable?: boolean;
  compact?: boolean;
}) {
  const visual = getStatutVisual(seance.statut);
  const d = new Date(seance.date);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return (
    <Link
      href={`/patients`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/seance-id", seance.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "block cursor-grab truncate rounded px-1.5 py-0.5 text-[11px] hover:opacity-90 active:cursor-grabbing",
        compact ? "leading-tight" : "",
        visual.badgeClass
      )}
      title={`${time} · ${seance.patientPrenom} ${seance.patientNom} · ${visual.label}`}
    >
      <span className="font-mono opacity-80">{time}</span>{" "}
      <span className="font-medium">{seance.patientPrenom} {seance.patientNom}</span>
    </Link>
  );
}

// ---------- Vue mois ----------

function MonthGrid({
  date,
  byDay,
  onDrop
}: {
  date: Date;
  byDay: Map<string, CalendarSeance[]>;
  onDrop: (id: string, newDate: Date) => void;
}) {
  const monthStart = startOfMonth(date);
  const gridStart = startOfWeekMonday(monthStart);
  const today = new Date();
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {FRENCH_WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const isCurrentMonth = d.getMonth() === date.getMonth();
          const isToday = isSameDay(d, today);
          const list = byDay.get(fmtDateUrl(d)) ?? [];
          return (
            <div
              key={i}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/seance-id");
                if (id) onDrop(id, d);
              }}
              className={cn(
                "min-h-[88px] rounded-md border bg-card/40 p-1 text-xs transition-colors hover:bg-accent/40",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                isToday && "border-primary"
              )}
            >
              <div className={cn("mb-1 text-[11px] font-medium", isToday && "text-primary")}>
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {list.slice(0, 3).map((s) => (
                  <SeanceChip key={s.id} seance={s} compact />
                ))}
                {list.length > 3 ? (
                  <div className="text-[10px] text-muted-foreground">+{list.length - 3}</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Vue semaine ----------

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 20;
const SLOT_MINUTES = 30;

function WeekGrid({
  date,
  byDay,
  onDrop
}: {
  date: Date;
  byDay: Map<string, CalendarSeance[]>;
  onDrop: (id: string, newDate: Date) => void;
}) {
  const weekStart = startOfWeekMonday(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const slotsCount = ((WORK_END_HOUR - WORK_START_HOUR) * 60) / SLOT_MINUTES;
  const slots = Array.from({ length: slotsCount }, (_, i) => {
    const minutes = WORK_START_HOUR * 60 + i * SLOT_MINUTES;
    return { h: Math.floor(minutes / 60), m: minutes % 60 };
  });

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-[60px_repeat(7,1fr)] gap-px bg-border">
        <div className="bg-card p-1 text-[10px] text-muted-foreground"></div>
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={cn(
              "bg-card p-1 text-center text-xs",
              isSameDay(d, new Date()) && "font-medium text-primary"
            )}
          >
            <div>{FRENCH_WEEKDAYS[(d.getDay() + 6) % 7]}</div>
            <div className="text-[10px] text-muted-foreground">
              {d.getDate()}/{d.getMonth() + 1}
            </div>
          </div>
        ))}

        {slots.map((slot, si) => (
          <FragmentRow
            key={`${slot.h}-${slot.m}`}
            slot={slot}
            days={days}
            byDay={byDay}
            onDrop={onDrop}
            isHourStart={slot.m === 0}
            slotIndex={si}
          />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({
  slot,
  days,
  byDay,
  onDrop,
  isHourStart
}: {
  slot: { h: number; m: number };
  days: Date[];
  byDay: Map<string, CalendarSeance[]>;
  onDrop: (id: string, newDate: Date) => void;
  isHourStart: boolean;
  slotIndex: number;
}) {
  return (
    <>
      <div
        className={cn(
          "bg-card p-1 text-right text-[10px] text-muted-foreground",
          !isHourStart && "opacity-40"
        )}
      >
        {String(slot.h).padStart(2, "0")}:{String(slot.m).padStart(2, "0")}
      </div>
      {days.map((d) => {
        const slotStart = new Date(d);
        slotStart.setHours(slot.h, slot.m, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60_000);
        const dayList = byDay.get(fmtDateUrl(d)) ?? [];
        const seancesInSlot = dayList.filter((s) => {
          const sd = new Date(s.date);
          return sd >= slotStart && sd < slotEnd;
        });
        return (
          <div
            key={d.toISOString()}
            className="min-h-[28px] bg-card p-0.5"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/seance-id");
              if (id) {
                // Pour la vue semaine, on snap au slot exact (heure + minute)
                const target = new Date(slotStart);
                onDrop(id, target);
              }
            }}
          >
            {seancesInSlot.map((s) => (
              <SeanceChip key={s.id} seance={s} compact />
            ))}
          </div>
        );
      })}
    </>
  );
}

// ---------- Vue jour ----------

function DayGrid({
  date,
  seances,
  onDrop
}: {
  date: Date;
  seances: CalendarSeance[];
  onDrop: (id: string, newDate: Date) => void;
}) {
  const slotsCount = ((WORK_END_HOUR - WORK_START_HOUR) * 60) / SLOT_MINUTES;
  const slots = Array.from({ length: slotsCount }, (_, i) => {
    const minutes = WORK_START_HOUR * 60 + i * SLOT_MINUTES;
    return { h: Math.floor(minutes / 60), m: minutes % 60 };
  });

  return (
    <div className="overflow-y-auto">
      <div className="grid grid-cols-[80px_1fr] gap-px bg-border">
        {slots.map((slot) => {
          const slotStart = new Date(date);
          slotStart.setHours(slot.h, slot.m, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60_000);
          const seancesInSlot = seances.filter((s) => {
            const sd = new Date(s.date);
            return sd >= slotStart && sd < slotEnd;
          });
          return (
            <FragmentDayRow
              key={slot.h * 60 + slot.m}
              slot={slot}
              slotStart={slotStart}
              seancesInSlot={seancesInSlot}
              onDrop={onDrop}
            />
          );
        })}
      </div>
    </div>
  );
}

function FragmentDayRow({
  slot,
  slotStart,
  seancesInSlot,
  onDrop
}: {
  slot: { h: number; m: number };
  slotStart: Date;
  seancesInSlot: CalendarSeance[];
  onDrop: (id: string, newDate: Date) => void;
}) {
  return (
    <>
      <div
        className={cn(
          "bg-card px-2 py-1 text-right text-xs text-muted-foreground",
          slot.m === 0 && "border-t font-medium text-foreground"
        )}
      >
        <Clock className="mr-1 inline h-3 w-3 opacity-60" />
        {String(slot.h).padStart(2, "0")}:{String(slot.m).padStart(2, "0")}
      </div>
      <div
        className={cn("min-h-[34px] bg-card p-1", slot.m === 0 && "border-t")}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/seance-id");
          if (id) onDrop(id, slotStart);
        }}
      >
        <div className="flex flex-wrap gap-1">
          {seancesInSlot.map((s) => (
            <SeanceChip key={s.id} seance={s} />
          ))}
        </div>
      </div>
    </>
  );
}
