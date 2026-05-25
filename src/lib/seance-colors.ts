import type { SeanceStatut } from "@/lib/utils";

export interface StatutVisual {
  /** Libellé court utilisateur. */
  label: string;
  /** Classe Tailwind à appliquer à un Badge / pastille. */
  badgeClass: string;
  /** Couleur HEX pour SVG (calendrier custom à venir). */
  hex: string;
}

export const SEANCE_STATUT_VISUALS: Record<SeanceStatut, StatutVisual> = {
  PLANIFIEE: {
    label: "Planifiée",
    badgeClass: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
    hex: "#3b82f6"
  },
  HONOREE: {
    label: "Honorée",
    badgeClass:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    hex: "#10b981"
  },
  ANNULEE_PATIENT: {
    label: "Annulée (patient)",
    badgeClass: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    hex: "#f59e0b"
  },
  ANNULEE_PRATICIEN: {
    label: "Annulée (praticien)",
    badgeClass:
      "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
    hex: "#f97316"
  },
  ABSENCE: {
    label: "Absence",
    badgeClass: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
    hex: "#ef4444"
  }
};

export function getStatutVisual(statut: string): StatutVisual {
  return (
    SEANCE_STATUT_VISUALS[statut as SeanceStatut] ?? {
      label: statut,
      badgeClass: "border-muted-foreground/30 bg-muted text-muted-foreground",
      hex: "#6b7280"
    }
  );
}
