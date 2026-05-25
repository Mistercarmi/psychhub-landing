-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "filename" TEXT,
    "detectedType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PREVIEW',
    "patientsCreated" INTEGER NOT NULL DEFAULT 0,
    "patientsUpdated" INTEGER NOT NULL DEFAULT 0,
    "seancesCreated" INTEGER NOT NULL DEFAULT 0,
    "seancesUpdated" INTEGER NOT NULL DEFAULT 0,
    "facturesCreated" INTEGER NOT NULL DEFAULT 0,
    "facturesUpdated" INTEGER NOT NULL DEFAULT 0,
    "conflictsResolved" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "mapping" TEXT,
    "errors" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExportTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "format" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "templateId" TEXT,
    "rowCounts" TEXT NOT NULL,
    "filePath" TEXT,
    "externalUrl" TEXT,
    "sizeBytes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExportTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "filePath" TEXT,
    "externalUrl" TEXT,
    "sizeBytes" INTEGER,
    "counts" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "errorMessage" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Config" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "cabinetNom" TEXT,
    "praticienNom" TEXT,
    "adresse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "siret" TEXT,
    "adeli" TEXT,
    "iban" TEXT,
    "tarifDefaut" REAL NOT NULL DEFAULT 60,
    "dureeDefaut" INTEGER NOT NULL DEFAULT 50,
    "tvaDefaut" REAL NOT NULL DEFAULT 0,
    "prefixeFacture" TEXT NOT NULL DEFAULT 'F',
    "templateMailRelance" TEXT,
    "templateMailConfirmation" TEXT,
    "googleRefreshToken" TEXT,
    "googleSheetBackupId" TEXT,
    "googleAccessMode" TEXT NOT NULL DEFAULT 'READ_WRITE',
    "googleConnectedAt" DATETIME,
    "googleAccountEmail" TEXT,
    "backupAutoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backupIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "backupLastRunAt" DATETIME,
    "backupWarningThresholdDays" INTEGER NOT NULL DEFAULT 3,
    "externalBackupFolder" TEXT,
    "backupDestinationsJson" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Config" ("adeli", "adresse", "cabinetNom", "dureeDefaut", "email", "googleAccessMode", "googleAccountEmail", "googleConnectedAt", "googleRefreshToken", "googleSheetBackupId", "iban", "id", "praticienNom", "prefixeFacture", "siret", "tarifDefaut", "telephone", "templateMailConfirmation", "templateMailRelance", "tvaDefaut", "updatedAt") SELECT "adeli", "adresse", "cabinetNom", "dureeDefaut", "email", "googleAccessMode", "googleAccountEmail", "googleConnectedAt", "googleRefreshToken", "googleSheetBackupId", "iban", "id", "praticienNom", "prefixeFacture", "siret", "tarifDefaut", "telephone", "templateMailConfirmation", "templateMailRelance", "tvaDefaut", "updatedAt" FROM "Config";
DROP TABLE "Config";
ALTER TABLE "new_Config" RENAME TO "Config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ImportLog_createdAt_idx" ON "ImportLog"("createdAt");

-- CreateIndex
CREATE INDEX "ImportLog_source_idx" ON "ImportLog"("source");

-- CreateIndex
CREATE UNIQUE INDEX "ExportTemplate_name_key" ON "ExportTemplate"("name");

-- CreateIndex
CREATE INDEX "ExportLog_createdAt_idx" ON "ExportLog"("createdAt");

-- CreateIndex
CREATE INDEX "ExportLog_format_idx" ON "ExportLog"("format");

-- CreateIndex
CREATE INDEX "BackupLog_createdAt_idx" ON "BackupLog"("createdAt");

-- CreateIndex
CREATE INDEX "BackupLog_type_idx" ON "BackupLog"("type");
