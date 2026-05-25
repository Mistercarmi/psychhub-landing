"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { updateBackupConfig } from "@/server/config.actions";

export type DestinationsConfigProps = {
  autoEnabled: boolean;
  intervalHours: number;
  warningThresholdDays: number;
  externalFolder: string | null;
};

const INTERVAL_OPTIONS = [
  { value: 1, label: "Chaque heure" },
  { value: 6, label: "Toutes les 6 heures" },
  { value: 12, label: "Toutes les 12 heures" },
  { value: 24, label: "Quotidienne" },
  { value: 48, label: "Tous les 2 jours" },
  { value: 168, label: "Hebdomadaire" }
];

export function DestinationsConfigCard(props: DestinationsConfigProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(props.autoEnabled);
  const [interval, setInterval] = useState(props.intervalHours);
  const [warning, setWarning] = useState(props.warningThresholdDays);
  const [folder, setFolder] = useState(props.externalFolder ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await updateBackupConfig({
          backupAutoEnabled: enabled,
          backupIntervalHours: interval,
          backupWarningThresholdDays: warning,
          externalBackupFolder: folder.trim() || null
        });
        toast.success("Paramètres enregistrés");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration des sauvegardes</CardTitle>
        <CardDescription>Automatisation, fréquence, dossier externe (OneDrive, Dropbox, etc.).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label className="text-sm font-medium">Sauvegarde automatique</Label>
            <p className="text-xs text-muted-foreground">
              Crée un snapshot à intervalle régulier, vers toutes les destinations configurées.
            </p>
          </div>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-5 w-5 cursor-pointer accent-primary"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Fréquence</Label>
            <Select value={String(interval)} onValueChange={(v) => setInterval(Number(v))} disabled={!enabled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Seuil d&apos;alerte (jours)</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={warning}
              onChange={(e) => setWarning(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Banderole orange si pas de sauvegarde depuis ce délai.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Dossier externe (OneDrive, Dropbox, etc.)</Label>
          <Input
            placeholder="C:\Users\…\OneDrive\PsychHub"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Chemin local qui pointe vers un service de synchro cloud. Laisser vide pour désactiver.</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={isPending}>{isPending ? "..." : "Enregistrer"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
