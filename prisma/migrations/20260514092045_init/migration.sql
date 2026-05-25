-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" DATETIME,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "numeroSecu" TEXT,
    "motifConsult" TEXT,
    "notesCliniques" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Seance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "dureeMinutes" INTEGER NOT NULL DEFAULT 50,
    "tarif" REAL NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PLANIFIEE',
    "sourceImport" TEXT,
    "doctolibRef" TEXT,
    "notesSeance" TEXT,
    "factureId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Seance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Seance_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dateEmission" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" DATETIME,
    "montantHT" REAL NOT NULL,
    "montantTTC" REAL NOT NULL,
    "tva" REAL NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "datePaiement" DATETIME,
    "modePaiement" TEXT,
    "notes" TEXT,
    "pdfPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Facture_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Config" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Patient_nom_prenom_idx" ON "Patient"("nom", "prenom");

-- CreateIndex
CREATE UNIQUE INDEX "Seance_doctolibRef_key" ON "Seance"("doctolibRef");

-- CreateIndex
CREATE INDEX "Seance_date_idx" ON "Seance"("date");

-- CreateIndex
CREATE INDEX "Seance_patientId_idx" ON "Seance"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_numero_key" ON "Facture"("numero");

-- CreateIndex
CREATE INDEX "Facture_statut_idx" ON "Facture"("statut");

-- CreateIndex
CREATE INDEX "Facture_dateEmission_idx" ON "Facture"("dateEmission");
