-- Résolution du drift entre schema.prisma et migrations.
-- Strictement additif : ADD COLUMN (avec DEFAULT) et CREATE TABLE.
-- Aucune destruction de donnée existante.

-- ============================================================
-- Patient : ajout photoUrl
-- ============================================================
ALTER TABLE "Patient" ADD COLUMN "photoUrl" TEXT;

-- ============================================================
-- Facture : lignes libres, acompte, trace relances envoyées
-- ============================================================
ALTER TABLE "Facture" ADD COLUMN "lignesLibres" TEXT;
ALTER TABLE "Facture" ADD COLUMN "acompte" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Facture" ADD COLUMN "relancesEnvoyeesJson" TEXT;

-- ============================================================
-- Config : rappels, identité visuelle PDF, paramètres relances
-- ============================================================
ALTER TABLE "Config" ADD COLUMN "templateMailRappelSeance" TEXT;
ALTER TABLE "Config" ADD COLUMN "rappelsActifs" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Config" ADD COLUMN "rappelsHeuresAvant" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "Config" ADD COLUMN "logoBase64" TEXT;
ALTER TABLE "Config" ADD COLUMN "couleurPrimaire" TEXT;
ALTER TABLE "Config" ADD COLUMN "mentionsLegales" TEXT;
ALTER TABLE "Config" ADD COLUMN "delaisRelancesJson" TEXT;

-- ============================================================
-- BackupLog : hash SHA-256, validation signature, logs détaillés
-- ============================================================
ALTER TABLE "BackupLog" ADD COLUMN "hash" TEXT;
ALTER TABLE "BackupLog" ADD COLUMN "signatureValid" BOOLEAN;
ALTER TABLE "BackupLog" ADD COLUMN "logs" TEXT;

-- ============================================================
-- Nouveau modèle : Paiement (versements partiels d'une facture)
-- ============================================================
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factureId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant" REAL NOT NULL,
    "mode" TEXT,
    "reference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Paiement_factureId_idx" ON "Paiement"("factureId");
CREATE INDEX "Paiement_date_idx" ON "Paiement"("date");

-- ============================================================
-- Nouveau modèle : FactureVersion (snapshot JSON à l'émission/avenant/annulation)
-- ============================================================
CREATE TABLE "FactureVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factureId" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FactureVersion_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "FactureVersion_factureId_idx" ON "FactureVersion"("factureId");
CREATE INDEX "FactureVersion_createdAt_idx" ON "FactureVersion"("createdAt");

-- ============================================================
-- Nouveau modèle : ImportMappingPreset (mappings XLSX/CSV → entités)
-- ============================================================
CREATE TABLE "ImportMappingPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "mapping" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "ImportMappingPreset_name_targetEntity_key" ON "ImportMappingPreset"("name", "targetEntity");
CREATE INDEX "ImportMappingPreset_source_idx" ON "ImportMappingPreset"("source");
CREATE INDEX "ImportMappingPreset_targetEntity_idx" ON "ImportMappingPreset"("targetEntity");
