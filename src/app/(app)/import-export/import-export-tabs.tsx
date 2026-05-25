"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Download,
  Upload,
  Cloud,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  HelpCircle
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ConnectionStatusCard } from "@/components/import-export/connection-status-card";
import { LocalBackupCard } from "@/components/import-export/local-backup-card";
import { ExcelExportCard, ExcelImportCard } from "@/components/import-export/excel-cards";
import { WordExportCard } from "@/components/import-export/word-export-card";
import { GoogleSheetsCard } from "@/components/import-export/google-sheets-card";
import { GoogleDriveCard } from "@/components/import-export/google-drive-card";
import { DoctolibImportCard } from "@/components/import-export/doctolib-import-card";
import { ImportWizard } from "@/components/import-export/import-wizard";
import { ExportComposer } from "@/components/import-export/export-composer";
import { FullSnapshotButton } from "@/components/sauvegardes/full-snapshot-button";

type PatientOption = { id: string; nom: string; prenom: string };
type SeanceOption = { id: string; date: string; patientNom: string; patientPrenom: string };
type TagOption = { id: string; name: string };

export type ImportExportProps = {
  google: {
    connected: boolean;
    email: string | null;
    connectedAt: string | null;
    mode: "READ_ONLY" | "READ_WRITE";
    sheetUrl: string | null;
  };
  patients: PatientOption[];
  seances: SeanceOption[];
  tags?: TagOption[];
  externalConfigured?: boolean;
};

const TAB_KEYS = ["importer", "exporter", "google"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export function ImportExportTabs({
  google,
  patients,
  seances,
  tags = [],
  externalConfigured = false
}: ImportExportProps) {
  const params = useSearchParams();
  const initial = (TAB_KEYS.includes(params.get("tab") as TabKey)
    ? params.get("tab")
    : "importer") as TabKey;
  const [tab, setTab] = useState<TabKey>(initial);

  useEffect(() => {
    const q = params.get("tab") as TabKey | null;
    if (q && TAB_KEYS.includes(q)) setTab(q);
  }, [params]);

  const writable = google.connected && google.mode === "READ_WRITE";

  return (
    <div className="space-y-4">
      <GoogleStatusBanner google={google} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="h-auto p-1">
          <TabsTrigger value="importer" className="gap-2 py-2">
            <Upload className="h-4 w-4" />
            Importer
          </TabsTrigger>
          <TabsTrigger value="exporter" className="gap-2 py-2">
            <Download className="h-4 w-4" />
            Exporter
          </TabsTrigger>
          <TabsTrigger value="google" className="gap-2 py-2">
            <Cloud className="h-4 w-4" />
            Google
          </TabsTrigger>
        </TabsList>

        {/* ======================== IMPORTER ======================== */}
        <TabsContent value="importer" className="space-y-4">
          <HelpBanner
            title="Faire entrer des données dans PsychHub"
            body={
              <>
                Glissez un fichier (Excel, CSV, export Doctolib) ou collez une URL Google
                Sheets. L&apos;assistant détecte le type, vérifie les doublons et range
                chaque ligne au bon endroit. <strong>Durée typique : 2 minutes.</strong>
              </>
            }
          />

          <ImportWizard />

          <details className="rounded-md border bg-muted/30 p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              Autres méthodes d&apos;import (avancé)
            </summary>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Import Doctolib direct (raccourci)
                </div>
                <DoctolibImportCard />
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Import Excel/CSV simple (sans assistant)
                </div>
                <ExcelImportCard />
              </div>
            </div>
          </details>
        </TabsContent>

        {/* ======================== EXPORTER ======================== */}
        <TabsContent value="exporter" className="space-y-4">
          <HelpBanner
            title="Sortir vos données de PsychHub"
            body={
              <>
                Téléchargez vos patients, séances, factures dans le format de votre
                choix : Excel, Google Sheets, Word (lettres, attestations) ou JSON. Les
                données sensibles (refresh token Google) ne quittent jamais ce poste.
              </>
            }
          />

          <QuickExports
            driveConnected={writable}
            externalConfigured={externalConfigured}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Word (lettres, attestations)
              </CardTitle>
              <CardDescription>
                Exporte une fiche patient ou un compte rendu de séance dans un fichier
                .docx prêt à imprimer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WordExportCard
                patients={patients}
                seances={seances}
                googleConnected={google.connected}
                googleWritable={writable}
              />
            </CardContent>
          </Card>

          <details className="rounded-md border" open>
            <summary className="cursor-pointer p-4 font-medium">
              Export personnalisé (choisir tables, filtres, colonnes)
            </summary>
            <div className="px-4 pb-4">
              <ExportComposer
                patients={patients.map((p) => ({
                  id: p.id,
                  label: `${p.prenom} ${p.nom}`
                }))}
                tags={tags}
                driveConnected={writable}
                externalConfigured={externalConfigured}
              />
            </div>
          </details>
        </TabsContent>

        {/* ======================== GOOGLE ======================== */}
        <TabsContent value="google" className="space-y-4">
          <HelpBanner
            title="Synchroniser avec votre compte Google"
            body={
              <>
                Connectez votre compte Google pour sauvegarder dans un Google Sheet, ou
                pour importer depuis un Sheet existant. Le refresh token reste sur ce
                poste et n&apos;est jamais exporté.
              </>
            }
          />

          <ConnectionStatusCard
            connected={google.connected}
            email={google.email}
            connectedAt={google.connectedAt}
            mode={google.mode}
          />

          {google.connected && (
            <>
              <GoogleSheetsCard
                connected={google.connected}
                writable={writable}
                sheetUrl={google.sheetUrl ?? undefined}
              />
              <GoogleDriveCard connected={google.connected} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Bandeau statut Google permanent (toujours visible)
// ============================================================

function GoogleStatusBanner({ google }: { google: ImportExportProps["google"] }) {
  if (google.connected) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
        <div className="flex-1">
          <span className="font-medium">Google connecté</span>
          <span className="text-muted-foreground"> · {google.email}</span>
          <Badge variant="outline" className="ml-2">
            {google.mode === "READ_ONLY" ? "Lecture seule" : "Lecture-écriture"}
          </Badge>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
      <div className="flex-1">
        <span className="font-medium">Google non connecté.</span>
        <span className="text-muted-foreground">
          {" "}
          Vous pouvez importer/exporter localement, mais la sauvegarde Google et l&apos;import
          depuis Sheets ne sont pas disponibles.
        </span>
      </div>
      <a
        href="/api/google/auth?mode=READ_WRITE"
        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
      >
        Connecter
      </a>
    </div>
  );
}

// ============================================================
// Bandeau d'aide contextuel
// ============================================================

function HelpBanner({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md border bg-muted/30 p-4">
      <HelpCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="space-y-1 text-sm">
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}

// ============================================================
// Exports rapides (1-clic)
// ============================================================

function QuickExports({
  driveConnected,
  externalConfigured
}: {
  driveConnected: boolean;
  externalConfigured: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Exports rapides
        </CardTitle>
        <CardDescription>
          Les actions les plus fréquentes en un clic. Pour personnaliser, utilisez la
          section &quot;Export personnalisé&quot; plus bas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">📊 Tout exporter en Excel</div>
            <div className="mb-3 text-xs text-muted-foreground">
              Patients, séances, factures, KPI dans un seul fichier .xlsx formaté.
            </div>
            <FullSnapshotButton externalConfigured={externalConfigured} />
          </div>
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">💾 Sauvegarder maintenant</div>
            <div className="mb-3 text-xs text-muted-foreground">
              Crée une sauvegarde locale immédiate (XLSX + JSON) dans le dossier
              Sauvegarde/.
            </div>
            <LocalBackupCard compact />
          </div>
        </div>
        <div className="rounded-md border p-3">
          <div className="mb-2 text-sm font-medium">📤 Export Excel détaillé</div>
          <div className="mb-3 text-xs text-muted-foreground">
            Téléchargement direct au format Excel multi-onglets avec mise en forme.
          </div>
          <ExcelExportCard />
        </div>
        {!driveConnected && (
          <p className="text-xs text-muted-foreground">
            💡 Connectez Google (en haut) pour activer l&apos;export direct vers Google
            Sheets / Drive.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
