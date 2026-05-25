"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Cloud, Download, FolderOpen, HardDrive, ExternalLink, FileX2, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

export type TimelineEntry = {
  id: string;
  kind: "backup" | "export" | "local_file";
  createdAt: string;
  type: string;
  destination: string;
  format: string;
  filePath?: string | null;
  externalUrl?: string | null;
  sizeBytes?: number | null;
  counts?: Record<string, number> | null;
  status: string;
  errorMessage?: string | null;
  triggeredBy?: string;
};

const TYPE_LABELS: Record<string, string> = {
  FULL_SNAPSHOT: "Snapshot complet",
  LOCAL_BACKUP: "Sauvegarde locale",
  GSHEETS_SYNC: "Sync Google Sheets",
  EXTERNAL_FOLDER: "Sauvegarde externe",
  EXPORT_COMPOSED: "Export composé"
};

function destinationIcon(d: string) {
  if (d === "drive") return <Cloud className="h-4 w-4" />;
  if (d.startsWith("local")) return <HardDrive className="h-4 w-4" />;
  if (d.startsWith("external") || d.includes(":\\") || d.startsWith("/")) return <FolderOpen className="h-4 w-4" />;
  return <Download className="h-4 w-4" />;
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function groupByMonth(entries: TimelineEntry[]): { month: string; rows: TimelineEntry[] }[] {
  const groups = new Map<string, TimelineEntry[]>();
  for (const e of entries) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, rows]) => ({
      month: new Date(`${key}-01`).toLocaleString("fr-FR", { month: "long", year: "numeric" }),
      rows
    }));
}

export function BackupTimeline({ entries: initial }: { entries: TimelineEntry[] }) {
  const router = useRouter();
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    diff: Record<string, { creates: number; updates: number; deletes: number }>;
    payload: unknown;
  } | null>(null);
  const grouped = groupByMonth(initial);

  async function openRestore(entry: TimelineEntry) {
    if (entry.type !== "GSHEETS_SYNC") {
      toast.error("Restauration auto uniquement depuis Google Sheets pour l'instant.");
      return;
    }
    setRestoring(true);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupLogId: entry.id.replace("backup:", ""), mode: "preview" })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRestorePreview({ diff: data.diff, payload: data.payload });
      setRestoreOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur preview");
    } finally {
      setRestoring(false);
    }
  }

  async function applyRestore() {
    if (!restorePreview) return;
    setRestoring(true);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "apply", payload: restorePreview.payload })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Restauration appliquée");
      setRestoreOpen(false);
      setRestorePreview(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur restauration");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des sauvegardes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {grouped.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-6">
            Aucune sauvegarde encore. Cliquez sur « Sauvegarder maintenant » pour en créer une.
          </div>
        )}
        {grouped.map((g) => (
          <section key={g.month} className="space-y-2">
            <h4 className="text-sm font-semibold capitalize text-muted-foreground">{g.month}</h4>
            <ul className="space-y-2">
              {g.rows.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    {destinationIcon(e.destination)}
                    <div className="text-sm">
                      <div className="font-medium">{TYPE_LABELS[e.type] ?? e.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(e.createdAt)} · {e.destination} · {e.format.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  {e.counts && (
                    <div className="flex gap-1.5">
                      {Object.entries(e.counts).slice(0, 4).map(([k, v]) => (
                        <Badge key={k} variant="secondary">{k}: {v}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">{formatSize(e.sizeBytes)}</div>
                  {e.triggeredBy === "scheduled" && <Badge variant="outline">Auto</Badge>}
                  {e.status === "FAILED" && (
                    <Badge variant="destructive">
                      <FileX2 className="h-3 w-3" /> Échec
                    </Badge>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    {e.externalUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={e.externalUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          Ouvrir
                        </a>
                      </Button>
                    )}
                    {e.filePath && e.kind === "local_file" && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/api/backup/local/${encodeURIComponent(e.filePath.split(/[/\\]/).pop() ?? "")}`}>
                          <Download className="h-3 w-3" />
                          Télécharger
                        </a>
                      </Button>
                    )}
                    {e.type === "GSHEETS_SYNC" && e.status === "OK" && (
                      <Button variant="outline" size="sm" disabled={restoring} onClick={() => openRestore(e)}>
                        <Eye className="h-3 w-3" />
                        Restaurer
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </CardContent>

      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prévisualisation de la restauration</DialogTitle>
            <DialogDescription>
              Cette opération <strong>remplace</strong> les données locales par celles de la sauvegarde. Vérifiez le différentiel avant de confirmer.
            </DialogDescription>
          </DialogHeader>
          {restorePreview && (
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(restorePreview.diff).map(([tab, d]) => (
                <div key={tab} className="rounded-md border p-3">
                  <div className="text-sm font-medium">{tab}</div>
                  <div className="mt-1 flex gap-2 text-xs">
                    <Badge variant="default">+{d.creates}</Badge>
                    <Badge variant="secondary">~{d.updates}</Badge>
                    <Badge variant="destructive">−{d.deletes}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreOpen(false)} disabled={restoring}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={applyRestore} disabled={restoring}>
              {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirmer la restauration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
