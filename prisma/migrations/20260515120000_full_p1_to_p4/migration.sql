-- Layout & LayoutPreset (P1)
CREATE TABLE "Layout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tabKey" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "modules" TEXT NOT NULL,
    "gridConfig" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Layout_tabKey_name_userId_key" ON "Layout"("tabKey", "name", "userId");
CREATE INDEX "Layout_tabKey_idx" ON "Layout"("tabKey");

CREATE TABLE "LayoutPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tabKey" TEXT NOT NULL,
    "modules" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tag + jointures (P3)
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

CREATE TABLE "PatientTag" (
    "patientId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    PRIMARY KEY ("patientId", "tagId"),
    CONSTRAINT "PatientTag_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PatientTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PatientTag_tagId_idx" ON "PatientTag"("tagId");

CREATE TABLE "SeanceTag" (
    "seanceId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    PRIMARY KEY ("seanceId", "tagId"),
    CONSTRAINT "SeanceTag_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "Seance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeanceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SeanceTag_tagId_idx" ON "SeanceTag"("tagId");

CREATE TABLE "FactureTag" (
    "factureId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    PRIMARY KEY ("factureId", "tagId"),
    CONSTRAINT "FactureTag_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FactureTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "FactureTag_tagId_idx" ON "FactureTag"("tagId");

-- AuditLog (P3)
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- SeanceTemplate (P3)
CREATE TABLE "SeanceTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "dureeMinutes" INTEGER NOT NULL DEFAULT 50,
    "tarif" REAL NOT NULL DEFAULT 60,
    "motifType" TEXT,
    "notesBase" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "SeanceTemplate_name_key" ON "SeanceTemplate"("name");

-- Indexes additionnels (P3)
CREATE INDEX "Patient_email_idx" ON "Patient"("email");
CREATE INDEX "Patient_actif_idx" ON "Patient"("actif");
CREATE INDEX "Seance_statut_date_idx" ON "Seance"("statut", "date");
CREATE INDEX "Facture_patientId_idx" ON "Facture"("patientId");
