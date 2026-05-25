/**
 * Libellés humains et variantes Badge pour les statuts de facture.
 * Source unique de vérité — à utiliser partout dans l'UI au lieu de
 * "BROUILLON", "EMISE", etc. en majuscules brutes.
 */

export type FactureStatut =
  | "BROUILLON"
  | "EMISE"
  | "PAYEE"
  | "EN_RETARD"
  | "ANNULEE";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const LABEL: Record<FactureStatut, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise — à payer",
  PAYEE: "Payée",
  EN_RETARD: "En retard",
  ANNULEE: "Annulée"
};

const SHORT_LABEL: Record<FactureStatut, string> = {
  BROUILLON: "Brouillon",
  EMISE: "À payer",
  PAYEE: "Payée",
  EN_RETARD: "En retard",
  ANNULEE: "Annulée"
};

const VARIANT: Record<FactureStatut, BadgeVariant> = {
  BROUILLON: "secondary",
  EMISE: "default",
  PAYEE: "outline",
  EN_RETARD: "destructive",
  ANNULEE: "outline"
};

const HELP: Record<FactureStatut, string> = {
  BROUILLON:
    "Encore modifiable. Le numéro de facture n'est pas figé. Vous pouvez ajouter/retirer des séances, changer la TVA, supprimer le brouillon.",
  EMISE:
    "Facture envoyée au patient. Le numéro est figé. En attente de paiement. Ne peut plus être supprimée, seulement annulée.",
  PAYEE: "Le règlement a été reçu. Plus aucune action requise.",
  EN_RETARD:
    "La date d'échéance est dépassée et la facture n'est pas encore payée. Pensez à relancer le patient.",
  ANNULEE:
    "La facture a été annulée. Les séances sont à nouveau facturables. Conservée pour la traçabilité comptable."
};

export function factureStatutLabel(s: string): string {
  return LABEL[s as FactureStatut] ?? s;
}

export function factureStatutShortLabel(s: string): string {
  return SHORT_LABEL[s as FactureStatut] ?? s;
}

export function factureStatutVariant(s: string): BadgeVariant {
  return VARIANT[s as FactureStatut] ?? "outline";
}

export function factureStatutHelp(s: string): string {
  return HELP[s as FactureStatut] ?? "";
}

export const FACTURE_STATUTS: FactureStatut[] = [
  "BROUILLON",
  "EMISE",
  "EN_RETARD",
  "PAYEE",
  "ANNULEE"
];

const MODE_LABEL: Record<string, string> = {
  VIREMENT: "Virement",
  CB: "Carte bancaire",
  CHEQUE: "Chèque",
  ESPECES: "Espèces",
  AUTRE: "Autre"
};

export function modePaiementLabel(s: string | null | undefined): string {
  if (!s) return "—";
  return MODE_LABEL[s] ?? s;
}

export const MODES_PAIEMENT = Object.keys(MODE_LABEL);
export { MODE_LABEL };
