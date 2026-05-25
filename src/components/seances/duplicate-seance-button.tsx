"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { duplicateSeance } from "@/server/seances.actions";

export interface DuplicateSeanceButtonProps {
  id: string;
  offsetDays?: number;
  /** "icon" : juste l'icône. "label" : icône + libellé. */
  variant?: "icon" | "label";
}

export function DuplicateSeanceButton({
  id,
  offsetDays = 7,
  variant = "icon"
}: DuplicateSeanceButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await duplicateSeance(id, offsetDays);
        toast.success(`Séance dupliquée (+${offsetDays} jours)`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la duplication");
      }
    });
  }

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={isPending}
        aria-label={`Dupliquer (+${offsetDays} jours)`}
        title={`Dupliquer (+${offsetDays} jours)`}
      >
        <Copy className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={isPending}>
      <Copy className="h-4 w-4" />
      Dupliquer
    </Button>
  );
}
