import Link from "next/link";
import {
  Building2,
  Coins,
  Mail,
  Cloud,
  HardDrive,
  History,
  Wrench,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { ConfigForm } from "@/components/parametres/config-form";
import { ConfigToolbar } from "@/components/parametres/config-toolbar";
import { GoogleSyncPanel } from "@/components/parametres/google-sync-panel";
import { AuditLogPanel } from "@/components/parametres/audit-log-panel";
import { SettingsSection } from "@/components/parametres/settings-section";
import { DatabaseHealthCard } from "@/components/parametres/database-health-card";
import { getConfig } from "@/server/config.actions";
import { readLastDatabaseIntegrity } from "@/server/backup-integrity.actions";
import { PageWithEditor } from "@/components/editor/page-with-editor";
import { ModulesDataProvider } from "@/editor/context/modules-data-context";
import { getLayout } from "@/server/layouts.actions";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const [config, savedLayout, dbIntegrity] = await Promise.all([
    getConfig(),
    getLayout("parametres"),
    readLastDatabaseIntegrity()
  ]);
  const sheetUrl = config?.googleSheetBackupId
    ? `https://docs.google.com/spreadsheets/d/${config.googleSheetBackupId}/edit`
    : undefined;

  const googleConnected = Boolean(config?.googleRefreshToken);
  const cabinetConfigured = Boolean(config?.cabinetNom);

  return (
    <>
      <Topbar title="Paramètres" showEditorToggle />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <ModulesDataProvider data={{}}>
          <PageWithEditor tabKey="parametres" initialLayout={savedLayout} fallback={null} />
        </ModulesDataProvider>

        {/* Bandeau d'aide global */}
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-1 text-sm">
            <div className="font-medium">Configurer PsychHub</div>
            <div className="text-muted-foreground">
              Tout est regroupé par thème ci-dessous. Cliquez sur une section pour la déplier.
              Vous pouvez tout configurer dans l&apos;ordre, ou seulement ce qui vous intéresse.
              Les modifications sont enregistrées dans chaque section.
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 1 — IDENTITÉ DU CABINET                                */}
        {/* ============================================================ */}
        <SettingsSection
          icon={<Building2 className="h-5 w-5" />}
          title="Mon cabinet"
          description="Nom, adresse, SIRET, ADELI, IBAN — utilisés sur vos factures"
          badge={
            cabinetConfigured ? (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                Configuré
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="h-3 w-3 text-amber-600" />
                À remplir
              </Badge>
            )
          }
          defaultOpen={!cabinetConfigured}
        >
          <ConfigForm
            initial={{
              cabinetNom: config?.cabinetNom ?? "",
              praticienNom: config?.praticienNom ?? "",
              adresse: config?.adresse ?? "",
              telephone: config?.telephone ?? "",
              email: config?.email ?? "",
              siret: config?.siret ?? "",
              adeli: config?.adeli ?? "",
              iban: config?.iban ?? "",
              tarifDefaut: config?.tarifDefaut ?? 60,
              dureeDefaut: config?.dureeDefaut ?? 50,
              tvaDefaut: config?.tvaDefaut ?? 0,
              prefixeFacture: config?.prefixeFacture ?? "F",
              templateMailRelance: config?.templateMailRelance ?? "",
              templateMailConfirmation: config?.templateMailConfirmation ?? "",
              templateMailRappelSeance: config?.templateMailRappelSeance ?? "",
              rappelsActifs: config?.rappelsActifs ?? false,
              rappelsHeuresAvant: config?.rappelsHeuresAvant ?? 24
            }}
          />
        </SettingsSection>

        {/* ============================================================ */}
        {/* SECTION 2 — TARIFS PAR DÉFAUT                                  */}
        {/* ============================================================ */}
        <SettingsSection
          icon={<Coins className="h-5 w-5" />}
          title="Tarifs et durée par défaut"
          description={`Actuellement : ${config?.tarifDefaut ?? 60}€ pour ${config?.dureeDefaut ?? 50} min · TVA ${config?.tvaDefaut ?? 0}% · préfixe facture "${config?.prefixeFacture ?? "F"}"`}
        >
          <p className="mb-3 text-sm text-muted-foreground">
            Ces valeurs sont proposées par défaut quand vous créez une nouvelle séance ou
            facture. Modifiez-les dans la section « Mon cabinet » ci-dessus (les champs
            sont regroupés dans le même formulaire).
          </p>
          <p className="text-xs text-muted-foreground">
            💡 Vous pouvez toujours changer le tarif au cas par cas dans chaque séance.
          </p>
        </SettingsSection>

        {/* ============================================================ */}
        {/* SECTION 3 — EMAILS AUTOMATIQUES                                */}
        {/* ============================================================ */}
        <SettingsSection
          icon={<Mail className="h-5 w-5" />}
          title="Modèles d'emails automatiques"
          description="Confirmation de RDV, relance de facture impayée, rappel avant séance"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Quand vous envoyez un email depuis PsychHub, le texte du modèle ci-dessous
              est inséré, avec les variables remplacées automatiquement.
            </p>
            <div className="rounded-md border bg-muted/20 p-3 text-xs">
              <div className="mb-1 font-medium">Variables disponibles dans les modèles :</div>
              <code className="block">
                {"{{prenom}}, {{nom}}, {{numero}}, {{montant}}, {{date}}, {{heure}}, {{duree}}, {{praticien}}"}
              </code>
            </div>
            <p className="text-sm text-muted-foreground">
              Les modèles se modifient dans la section « Mon cabinet » ci-dessus (champs
              « Email de confirmation » et « Email de relance »).
            </p>
            <ConfigToolbar
              templates={{
                relance: config?.templateMailRelance ?? null,
                confirmation: config?.templateMailConfirmation ?? null,
                rappel:
                  (config as { templateMailRappelSeance?: string | null } | null)
                    ?.templateMailRappelSeance ?? null
              }}
              praticienNom={config?.praticienNom ?? null}
              cabinetNom={config?.cabinetNom ?? null}
            />
          </div>
        </SettingsSection>

        {/* ============================================================ */}
        {/* SECTION 4 — SYNCHRONISATION GOOGLE                             */}
        {/* ============================================================ */}
        <SettingsSection
          icon={<Cloud className="h-5 w-5" />}
          title="Synchronisation Google"
          description={
            googleConnected
              ? "Connecté · sauvegarde automatique vers Google Sheets disponible"
              : "Non connecté · ne sera pas utilisé tant que vous ne connectez pas"
          }
          badge={
            googleConnected ? (
              <Badge className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connecté
              </Badge>
            ) : (
              <Badge variant="outline">Non connecté</Badge>
            )
          }
        >
          <GoogleSyncPanel connected={googleConnected} sheetUrl={sheetUrl} />
          <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
            💡 Pour <strong>importer ou exporter ponctuellement</strong> vers Google
            Sheets / Drive, utilisez plutôt la page{" "}
            <Link
              href="/import-export?tab=google"
              className="font-medium underline-offset-2 hover:underline"
            >
              Importer & Exporter mes données <ExternalLink className="inline h-3 w-3" />
            </Link>
            . Cette section sert uniquement à configurer la sauvegarde automatique.
          </div>
        </SettingsSection>

        {/* ============================================================ */}
        {/* SECTION 5 — SAUVEGARDES                                         */}
        {/* ============================================================ */}
        <SettingsSection
          icon={<HardDrive className="h-5 w-5" />}
          title="Sauvegardes automatiques"
          description="Fréquence, dossier externe, rétention des fichiers"
        >
          <div className="space-y-4 text-sm">
            <p>
              PsychHub crée automatiquement une sauvegarde de toutes vos données toutes
              les <strong>{config?.backupIntervalHours ?? 24} heures</strong>, dans le
              dossier <code className="rounded bg-muted px-1">Sauvegarde/</code>.
            </p>
            <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
              <li>
                Sauvegarde automatique :{" "}
                <strong>{config?.backupAutoEnabled ? "activée" : "désactivée"}</strong>
              </li>
              <li>
                Rétention :{" "}
                <strong>{config?.backupRetentionDays ?? 30} jours</strong> (les fichiers
                plus anciens sont supprimés automatiquement, au moins{" "}
                {config?.backupMinKeep ?? 7} fichiers conservés en permanence)
              </li>
              <li>
                Alerte si pas de backup depuis :{" "}
                <strong>{config?.backupWarningThresholdDays ?? 3} jours</strong>
              </li>
              {config?.externalBackupFolder && (
                <li>
                  Dossier externe :{" "}
                  <code className="rounded bg-muted px-1 text-xs">
                    {config.externalBackupFolder}
                  </code>
                </li>
              )}
            </ul>

            <DatabaseHealthCard initial={dbIntegrity} />

            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              💡 Pour <strong>créer une sauvegarde manuelle maintenant</strong>,
              consulter la liste des fichiers ou restaurer, allez sur la page{" "}
              <Link
                href="/sauvegardes"
                className="font-medium underline-offset-2 hover:underline"
              >
                Sauvegardes <ExternalLink className="inline h-3 w-3" />
              </Link>
              .
            </div>
          </div>
        </SettingsSection>

        {/* ============================================================ */}
        {/* SECTION 6 — JOURNAL D'ACTIVITÉ                                 */}
        {/* ============================================================ */}
        <SettingsSection
          icon={<History className="h-5 w-5" />}
          title="Journal d'activité"
          description="Toutes les modifications faites dans PsychHub (création, modification, suppression)"
        >
          <p className="mb-3 text-sm text-muted-foreground">
            Chaque ajout, modification ou suppression de patient, séance, facture ou
            configuration est enregistré ici. Utile en cas de doute ou pour retracer
            une modification.
          </p>
          <AuditLogPanel />
        </SettingsSection>

        {/* ============================================================ */}
        {/* SECTION 7 — AVANCÉ                                              */}
        {/* ============================================================ */}
        <SettingsSection
          icon={<Wrench className="h-5 w-5" />}
          title="Options avancées"
          description="Exporter/importer mes paramètres, restaurer les valeurs d'usine"
        >
          <p className="mb-3 text-sm text-muted-foreground">
            Pour les utilisateurs expérimentés. Permet de copier la configuration d&apos;un
            poste à un autre (utile si vous changez d&apos;ordinateur), ou de revenir aux
            valeurs par défaut en cas de souci.
          </p>
          <p className="text-xs text-muted-foreground">
            ⚠️ « Restaurer les valeurs par défaut » efface vos templates email et tarifs,
            mais conserve la connexion Google et les paramètres de sauvegarde. Une
            confirmation est demandée.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            👉 Les boutons d&apos;import/export et de restauration sont dans la section
            « Modèles d&apos;emails automatiques » ci-dessus.
          </p>
        </SettingsSection>
      </div>
    </>
  );
}
