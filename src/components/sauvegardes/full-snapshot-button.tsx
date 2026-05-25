"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FolderOpen, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Destination = "download" | "local_folder" | "external_folder";

export function FullSnapshotButton({
  externalConfigured = false,
  label = "Exporter toute la base"
}: {
  externalConfigured?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [destination, setDestination] = useState<Destination>("download");

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/export/snapshot-full?destination=${destination}`);
      if (destination === "download") {
        if (!res.ok) throw new Error(await res.text());
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const disp = res.headers.get("Content-Disposition") ?? "";
        const m = disp.match(/filename="?([^";]+)"?/);
        a.download = m?.[1] ?? "psychhub-snapshot.xlsx";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Snapshot téléchargé");
      } else {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Erreur snapshot");
        }
        const data = await res.json();
        toast.success(`Snapshot écrit : ${data.filename}`);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur snapshot");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Download className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exporter toute la base</DialogTitle>
          <DialogDescription>
            Génère un fichier Excel multi-onglets parfaitement lisible : sommaire avec liens, méta, patients, séances, factures (avec totaux), KPI synthèse, tags, modèles et journal d&apos;activité.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Destination</Label>
          <DestinationCard
            value="download"
            current={destination}
            onSelect={setDestination}
            icon={<Download className="h-4 w-4" />}
            title="Téléchargement direct"
            desc="Sauvegarde le fichier dans votre dossier Téléchargements"
          />
          <DestinationCard
            value="local_folder"
            current={destination}
            onSelect={setDestination}
            icon={<HardDrive className="h-4 w-4" />}
            title="Dossier local Sauvegarde/"
            desc="Écrit dans le dossier de l'app (versionné par date+heure)"
          />
          <DestinationCard
            value="external_folder"
            current={destination}
            onSelect={setDestination}
            icon={<FolderOpen className="h-4 w-4" />}
            title="Dossier externe (OneDrive, Dropbox…)"
            desc={
              externalConfigured
                ? "Utilise le chemin configuré dans les Paramètres"
                : "Configurer d'abord un chemin dans Paramètres → Sauvegardes"
            }
            disabled={!externalConfigured}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={run} disabled={busy}>
            {busy ? "Génération…" : "Exporter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DestinationCard({
  value,
  current,
  onSelect,
  icon,
  title,
  desc,
  disabled = false
}: {
  value: Destination;
  current: Destination;
  onSelect: (v: Destination) => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  disabled?: boolean;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(value)}
      disabled={disabled}
      className={
        "flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors " +
        (active ? "border-primary bg-primary/5" : "border-input hover:bg-accent/40") +
        (disabled ? " cursor-not-allowed opacity-50" : "")
      }
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <input
        type="radio"
        readOnly
        checked={active}
        className="mt-1 h-4 w-4 cursor-pointer accent-primary"
      />
    </button>
  );
}
