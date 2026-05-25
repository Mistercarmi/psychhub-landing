-- Ajout d'un horodatage sur Seance pour tracer le dernier rappel mail envoyé.
-- Nullable, réinitialisé à null par seances.actions.ts:updateSeance si la date change.
ALTER TABLE "Seance" ADD COLUMN "rappelEnvoyeAt" DATETIME;
