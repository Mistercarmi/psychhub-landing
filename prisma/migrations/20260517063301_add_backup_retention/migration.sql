-- Ajout des champs de rétention/rotation des sauvegardes locales.
-- Conserve par défaut 30 jours et au moins 7 fichiers.
ALTER TABLE "Config" ADD COLUMN "backupRetentionDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Config" ADD COLUMN "backupMinKeep" INTEGER NOT NULL DEFAULT 7;
