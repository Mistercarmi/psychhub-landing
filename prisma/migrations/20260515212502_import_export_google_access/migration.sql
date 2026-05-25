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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Config" ("adeli", "adresse", "cabinetNom", "dureeDefaut", "email", "googleRefreshToken", "googleSheetBackupId", "iban", "id", "praticienNom", "prefixeFacture", "siret", "tarifDefaut", "telephone", "templateMailConfirmation", "templateMailRelance", "tvaDefaut", "updatedAt") SELECT "adeli", "adresse", "cabinetNom", "dureeDefaut", "email", "googleRefreshToken", "googleSheetBackupId", "iban", "id", "praticienNom", "prefixeFacture", "siret", "tarifDefaut", "telephone", "templateMailConfirmation", "templateMailRelance", "tvaDefaut", "updatedAt" FROM "Config";
DROP TABLE "Config";
ALTER TABLE "new_Config" RENAME TO "Config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
