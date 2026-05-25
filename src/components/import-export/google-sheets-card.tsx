"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload, ExternalLink, Sheet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

type Diff = {
  spreadsheetId: string;
  url: string;
  diff: Record<string, { creates: number; updates: number; deletes: number }>;
  payload: Record<string, Record<string, unknown>[]>;
};

type Props = {
  connected: boolean;
  writable: boolean;
  sheetUrl?: string;
};

export function GoogleSheetsCard({ connected, writable, sheetUrl }: Props) {
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
        <CardTitle className="flex items-center gap-2">
          <Sheet className="h-5 w-5" />
          Google Sheets — Backup complet
        </CardTitle>
        <CardDescription>
          Export complet (un onglet par table) + restore avec diff et confirmation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!connected ? (
          <div className="text-sm text-muted-foreground">
            Connectez votre compte Google dans l&apos;onglet « Vue d&apos;ensemble ».
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <ConfirmDialog
              title="Exporter toutes les données vers Google Sheets ?"
              description="Le contenu actuel du Google Sheet de backup sera écrasé. Cette action est sûre — elle n'affecte pas la base locale."
              confirmLabel="Exporter"
              trigger={
                <Button disabled={busy || !writable} title={!writable ? "Mode lecture seule" : ""}>
                  <Upload className="h-4 w-4" />
                  Exporter vers Sheets
                </Button>
              }
              onConfirm={handleExport}
            />

            <Button variant="outline" disabled={busy} onClick={fetchDiff}>
              <Download className="h-4 w-4" />
              Prévisualiser un restore
            </Button>

            {sheetUrl && (
              <Button variant="ghost" asChild>
                <a href={sheetUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir le sheet
                </a>
              </Button>
            )}
          </div>
        )}

        {diff && (
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <div className="mb-2 font-medium">Diff vs base locale</div>
            <ul className="space-y-1 text-xs">
              {Object.entries(diff.diff).map(([tab, d]) => (
                <li key={tab}>
                  <strong>{tab}</strong> : +{d.creates} · ~{d.updates} · −{d.deletes}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <ConfirmDialog
                destructive
                title="Appliquer le restore ?"
                description="ATTENTION : toute la base locale (Patients, Séances, Factures) sera remplacée par le contenu du Google Sheet. Faites une sauvegarde locale d'abord."
                confirmLabel="Appliquer le restore"
                trigger={
                  <Button variant="destructive" disabled={busy}>
                    Appliquer
                  </Button>
                }
                onConfirm={applyRestore}
              />
              <Button variant="ghost" onClick={() => setDiff(null)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
