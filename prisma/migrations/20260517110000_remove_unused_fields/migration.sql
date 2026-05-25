-- Suppression de FactureVersion (modèle complet jamais utilisé) et BackupLog.logs
-- (champ jamais écrit). Les autres champs orphelins de l'audit sont conservés :
-- Config.logoBase64/couleurPrimaire/mentionsLegales sont **déjà consommés** par
-- les templates PDF (facture, dossier patient) — pas d'UI de saisie, mais valeur
-- réelle si éditée via Prisma Studio ou future UI.

-- ============================================================
-- DROP TABLE FactureVersion (+ ses indexes implicites)
-- ============================================================
DROP TABLE IF EXISTS "FactureVersion";

-- ============================================================
-- BackupLog : retrait de la colonne `logs` via RedefineTable SQLite
-- ============================================================
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_BackupLog" (
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
    "hash" TEXT,
    "signatureValid" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_BackupLog" (
    "id", "type", "format", "destination", "filePath", "externalUrl",
    "sizeBytes", "counts", "status", "errorMessage", "triggeredBy",
    "hash", "signatureValid", "createdAt"
) SELECT
    "id", "type", "format", "destination", "filePath", "externalUrl",
    "sizeBytes", "counts", "status", "errorMessage", "triggeredBy",
    "hash", "signatureValid", "createdAt"
FROM "BackupLog";

DROP TABLE "BackupLog";
ALTER TABLE "new_BackupLog" RENAME TO "BackupLog";

CREATE INDEX "BackupLog_createdAt_idx" ON "BackupLog"("createdAt");
CREATE INDEX "BackupLog_type_idx" ON "BackupLog"("type");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
