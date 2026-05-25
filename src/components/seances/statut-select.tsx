"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { SEANCE_STATUTS, type SeanceStatut } from "@/lib/utils";
import { SEANCE_STATUT_VISUALS } from "@/lib/seance-colors";
import { updateSeanceStatut } from "@/server/seances.actions";
import { cn } from "@/lib/utils";

export interface StatutSelectProps {
  seanceId: string;
  initial: SeanceStatut;
  /** Taille compacte pour usage inline en table. */
  compact?: boolean;
  className?: string;
}

export function StatutSelect({ seanceId, initial, compact = true, className }: StatutSelectProps) {
  const [value, setValue] = useState<SeanceStatut>(initial);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    const nextStatut = next as SeanceStatut;
    const previous = value;
    setValue(nextStatut); // optimistic
    startTransition(async () => {
      try {
        await updateSeanceStatut(seanceId, nextStatut);
        toast.success(`Statut → ${SEANCE_STATUT_VISUALS[nextStatut].label}`);
      } catch (err) {
        setValue(previous); // rollback
        toast.error(err instanceof Error ? err.message : "Erreur lors du changement de statut");
      }
    });
  }

  const visual = SEANCE_STATUT_VISUALS[value];

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className={cn(
          "min-w-[140px] gap-1 border",
          compact && "h-8 px-2 py-0 text-xs",
          visual.badgeClass,
          isPending && "opacity-60",
          className
        )}
        aria-label="Changer le statut"
      >
        <SelectValue>{visual.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SEANCE_STATUTS.map((s) => (
          <SelectItem key={s} value={s}>
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: SEANCE_STATUT_VISUALS[s].hex }}
              />
              {SEANCE_STATUT_VISUALS[s].label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
