"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Upload, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

type Diff = { creates: number; updates: number; unchanged: number };

export function ExcelExportCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Excel / CSV
        </CardTitle>
        <CardDescription>
          Télécharge un fichier .xlsx multi-onglets avec Patients, Séances, Factures, Configuration,
          Tags et Templates. En-têtes en français lisibles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <a href="/api/export/excel">
            <Download className="h-4 w-4" />
            Télécharger l&apos;export Excel
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

export function ExcelImportCard() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, Diff> | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(apply: boolean) {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("apply", apply ? "true" : "false");
      const res = await fetch("/api/import/excel", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      const data = await res.json();
      if (!apply) {
        setPreview(data.diff);
        toast.success("Aperçu généré");
      } else {
        toast.success(
          `Import OK — Patients ${data.patients.creates}/${data.patients.updates} · Séances ${data.seances.creates}/${data.seances.updates} · Factures ${data.factures.creates}/${data.factures.updates}`
        );
        setPreview(null);
        setFile(null);
      }
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
          <Upload className="h-5 w-5" />
          Import Excel / CSV
        </CardTitle>
        <CardDescription>
          Charge un fichier .xlsx (mêmes onglets que l&apos;export) ou un .csv (Patients). Aperçu
          obligatoire avant application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
            }}
          />
          <Button onClick={() => send(false)} disabled={!file || busy}>
            <Upload className="h-4 w-4" />
            Prévisualiser
          </Button>
        </div>

        {preview && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="mb-2 font-medium">Aperçu des changements</div>
            <ul className="space-y-1 text-xs">
              {Object.entries(preview).map(([tab, d]) => (
                <li key={tab}>
                  <strong>{tab}</strong> : +{d.creates} créations · ~{d.updates} mises à jour
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <ConfirmDialog
                destructive
                title="Appliquer l'import ?"
                description="Les lignes seront créées ou mises à jour. Une sauvegarde locale est recommandée avant tout import."
                confirmLabel="Appliquer"
                trigger={
                  <Button disabled={busy}>
                    <CheckCircle2 className="h-4 w-4" />
                    Appliquer
                  </Button>
                }
                onConfirm={() => send(true)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
