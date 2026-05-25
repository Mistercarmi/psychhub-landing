"use client";

import { ChevronRight } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section dépliante pour la page Paramètres.
 * Utilise <details>/<summary> natifs : accessible clavier + screen reader,
 * pas de dépendance supplémentaire.
 *
 * @param icon — icône Lucide rendue en tête (ex: <Building2 />)
 * @param title — titre court (ex: "Mon cabinet")
 * @param description — sous-titre court (ex: "Identité, adresse, SIRET")
 * @param defaultOpen — replié par défaut (false) sauf si explicitement true
 * @param badge — badge optionnel à droite (ex: "Connecté", "À configurer")
 */
export function SettingsSection({
  icon,
  title,
  description,
  badge,
  defaultOpen = false,
  children
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-lg border bg-card text-card-foreground transition-colors",
        "[&[open]]:bg-background"
      )}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-3 rounded-lg p-4",
          "hover:bg-accent/30",
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        {icon && (
          <span className="shrink-0 text-muted-foreground" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-tight">{title}</div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  );
}
