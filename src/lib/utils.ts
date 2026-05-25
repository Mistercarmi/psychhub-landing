import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEuros(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

export function formatDateFr(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatDateTimeFr(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export const SEANCE_STATUTS = [
  "PLANIFIEE",
  "HONOREE",
  "ANNULEE_PATIENT",
  "ANNULEE_PRATICIEN",
  "ABSENCE"
] as const;
export type SeanceStatut = (typeof SEANCE_STATUTS)[number];

export const FACTURE_STATUTS = ["BROUILLON", "EMISE", "PAYEE", "EN_RETARD", "ANNULEE"] as const;
export type FactureStatut = (typeof FACTURE_STATUTS)[number];
