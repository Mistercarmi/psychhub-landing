"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Cloud, Download, Upload, ExternalLink, Unplug } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { disconnectGoogle } from "@/server/config.actions";

type Diff = {
  spreadsheetId: string;
  url: string;
  diff: Record<string, { creates: number; updates: number; deletes: number }>;
  payload: Record<string, Record<string, unknown>[]>;
};

export function GoogleSyncPanel({ connected, sheetUrl }: { connected: boolean; sheetUrl?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [diff, setDiff] = useState<Diff | null>(null);

  async function handleExport() {
    setBusy(true);
    try {
      const res = await fetch("/api/google/sheets/export", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      const data = await res.json();
      toast.success(
        `Export OK — ${data.counts.Patients} patients · ${data.counts.Seances} séances · ${data.counts.Factures} factures`
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function fetchDiff() {
    setBusy(true);
    try {
      const res = await fetch("/api/google/sheets/import");
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      setDiff(await res.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function applyRestore() {
    if (!diff) return;
    setBusy(true);
    try {
      const res = await fetch("/api/google/sheets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: diff.payload })
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      const data = await res.json();
      toast.success(
        `Restore OK — ${data.patients} patients · ${data.seances} séances · ${data.factures} factures`
      );
      setDiff(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Sauvegarde dans Google Sheets
            </CardTitle>
            <CardDescription>
              Toutes vos données (patients, séances, factures…) sont copiées dans un
              tableur Google, un onglet par catégorie. Permet de retrouver vos données
              même si votre ordinateur tombe en panne.{" "}
              <strong>
                Vos identifiants Google ne quittent jamais ce poste.
              </strong>
            </CardDescription>
          </div>
          {connected ? (
            <Badge>Connecté</Badge>
          ) : (
            <Badge variant="outline">Non connecté</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pour activer la sauvegarde Google, connectez votre compte. Une fenêtre
              Chrome s&apos;ouvrira pour vous authentifier.
            </p>
            <Button asChild>
              <a href="/api/google/auth">
                <Cloud className="h-4 w-4" />
                Connecter mon compte Google
              </a>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <ConfirmDialog
              title="Sauvegarder maintenant dans Google Sheets ?"
              description="Le contenu actuel du Google Sheet sera remplacé par toutes vos données actuelles. Sans risque pour votre base locale — c'est juste une copie."
              confirmLabel="Oui, sauvegarder"
              trigger={
                <Button disabled={busy}>
                  <Upload className="h-4 w-4" />
                  Sauvegarder maintenant
                </Button>
              }
              onConfirm={handleExport}
            />

            <Button variant="outline" disabled={busy} onClick={fetchDiff}>
              <Download className="h-4 w-4" />
              Voir ce qui changerait si je restaurais
            </Button>

            {sheetUrl && (
              <Button variant="ghost" asChild>
                <a href={sheetUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir le tableur Google
                </a>
              </Button>
            )}

            <ConfirmDialog
              destructive
              title="Déconnecter mon compte Google ?"
              description="La sauvegarde automatique vers Google sera désactivée. Vos données restent intactes. Vous pourrez vous reconnecter à tout moment."
              confirmLabel="Déconnecter"
              trigger={
                <Button variant="ghost" disabled={busy}>
                  <Unplug className="h-4 w-4" />
                  Déconnecter
                </Button>
              }
              onConfirm={async () => {
                await disconnectGoogle();
                toast.success("Compte Google déconnecté");
                router.refresh();
              }}
            />
          </div>
        )}

        {diff && (
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <div className="mb-2 font-medium">
              Différences entre Google Sheets et votre base locale
            </div>
            <ul className="space-y-1 text-xs">
              {Object.entries(diff.diff).map(([tab, d]) => (
                <li key={tab}>
                  <strong>{tab}</strong> : <span className="text-green-600">+{d.creates} créations</span>
                  {" · "}
                  <span className="text-blue-600">~{d.updates} modifications</span>
                  {" · "}
                  <span className="text-red-600">−{d.deletes} suppressions</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <ConfirmDialog
                destructive
                title="Restaurer depuis Google Sheets ?"
                description="⚠️ ATTENTION : toute votre base locale (patients, séances, factures) sera remplacée par le contenu du tableur Google. Cette action est IRRÉVERSIBLE. Faites une sauvegarde locale d'abord (page Sauvegardes) si vous avez le moindre doute."
                confirmLabel="J'ai compris, restaurer"
                trigger={
                  <Button variant="destructive" disabled={busy}>
                    Restaurer (écrase ma base locale)
                  </Button>
                }
                onConfirm={applyRestore}
              />
              <Button variant="ghost" onClick={() => setDiff(null)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
