"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HardDrive, FileSpreadsheet, FileJson, Download, RefreshCw, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

type BackupFile = { name: string; size: number; mtime: string; kind: "xlsx" | "json" };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

/**
 * @param compact - Mode condensé : un bouton "Créer une sauvegarde" sans liste des fichiers.
 *                  Utilisé dans la section "Exports rapides".
 */
export function LocalBackupCard({ compact = false }: { compact?: boolean } = {}) {
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [dir, setDir] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const res = await fetch("/api/backup/local");
      const data = await res.json();
      setFiles(data.files ?? []);
      setDir(data.dir ?? "");
    } catch {
      // silent
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createBackup() {
    setBusy(true);
    try {
      const res = await fetch("/api/backup/local", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      const data = await res.json();
      toast.success(
        `Sauvegarde créée — ${data.counts.patients} patients · ${data.counts.seances} séances · ${data.counts.factures} factures`
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function deleteFile(name: string) {
    const res = await fetch(`/api/backup/local/${encodeURIComponent(name)}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Fichier supprimé");
      await refresh();
    } else {
      toast.error("Suppression impossible");
    }
  }

  if (compact) {
    return (
      <Button onClick={createBackup} disabled={busy} className="w-full">
        <HardDrive className="h-4 w-4" />
        {busy ? "Création…" : "Créer une sauvegarde"}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Sauvegarde locale
        </CardTitle>
        <CardDescription>
          Crée deux fichiers horodatés dans le dossier <code className="rounded bg-muted px-1">Sauvegarde/</code> :
          un <strong>.xlsx</strong> multi-onglets (lisible humainement) et un <strong>.json</strong> complet
          (fidèle pour restauration).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={createBackup} disabled={busy}>
            <HardDrive className="h-4 w-4" />
            Créer une sauvegarde maintenant
          </Button>
          <Button variant="outline" onClick={refresh} disabled={busy}>
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </Button>
        </div>
        {dir && (
          <div className="text-xs text-muted-foreground">
            Dossier : <code className="rounded bg-muted px-1">{dir}</code>
          </div>
        )}

        {files.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucune sauvegarde pour l&apos;instant.
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {files.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {f.kind === "xlsx" ? (
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <FileJson className="h-4 w-4 shrink-0 text-blue-600" />
                  )}
                  <span className="truncate font-mono text-xs">{f.name}</span>
                  <Badge variant="outline" className="shrink-0">{formatSize(f.size)}</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <a href={`/api/backup/local/${encodeURIComponent(f.name)}`} download>
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <ConfirmDialog
                    destructive
                    title="Supprimer cette sauvegarde ?"
                    description={`Le fichier ${f.name} sera supprimé définitivement.`}
                    confirmLabel="Supprimer"
                    trigger={
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    }
                    onConfirm={() => deleteFile(f.name)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
