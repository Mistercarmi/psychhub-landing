"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type HealthStatus = "ok" | "warning" | "critical" | "unknown";

export type BackupHealthProps = {
  lastBackupAt: string | null;
  daysSinceLast: number | null;
  status: HealthStatus;
  warningThresholdDays: number;
  nextScheduledAt: string | null;
  autoEnabled: boolean;
  intervalHours: number;
  driveConnected: boolean;
  externalConfigured: boolean;
};

const STATUS_COPY: Record<HealthStatus, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  ok: {
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-900",
    icon: <ShieldCheck className="h-5 w-5" />,
    label: "Sauvegardes à jour"
  },
  warning: {
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900",
    icon: <ShieldAlert className="h-5 w-5" />,
    label: "Sauvegarde un peu ancienne"
  },
  critical: {
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900",
    icon: <ShieldX className="h-5 w-5" />,
    label: "Sauvegarde manquante ou critique"
  },
  unknown: {
    color: "text-muted-foreground",
    bg: "bg-muted/30",
    border: "border-muted",
    icon: <ShieldAlert className="h-5 w-5" />,
    label: "État inconnu"
  }
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export function HealthBanner(props: BackupHealthProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const copy = STATUS_COPY[props.status];

  async function runNow() {
    const destinations: string[] = ["local"];
    if (props.driveConnected) destinations.push("drive");
    if (props.externalConfigured) destinations.push("external");

    setRunning(true);
    try {
      const res = await fetch("/api/backup/run-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinations })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const ok = (data.results ?? []).filter((r: { status: string }) => r.status === "OK").length;
      const failed = (data.results ?? []).filter((r: { status: string }) => r.status !== "OK").length;
      if (failed === 0) toast.success(`Sauvegarde effectuée — ${ok} destination(s)`);
      else toast.warning(`Sauvegarde partielle — ${ok} OK, ${failed} échec/ignoré`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur sauvegarde");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className={`${copy.bg} ${copy.border}`}>
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <div className={`flex items-center gap-2 ${copy.color}`}>
          {copy.icon}
          <span className="font-medium">{copy.label}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {props.lastBackupAt ? (
            <>
              Dernière : <span className="font-medium text-foreground">{formatDate(props.lastBackupAt)}</span>
              {props.daysSinceLast !== null && <> · il y a {props.daysSinceLast} jour{props.daysSinceLast > 1 ? "s" : ""}</>}
            </>
          ) : (
            "Aucune sauvegarde enregistrée."
          )}
        </div>
        <div className="flex items-center gap-2">
          {props.autoEnabled && props.nextScheduledAt && (
            <Badge variant="outline">Prochaine auto : {formatDate(props.nextScheduledAt)}</Badge>
          )}
          {!props.autoEnabled && <Badge variant="outline">Auto désactivée</Badge>}
        </div>
        <div className="ml-auto">
          <Button onClick={runNow} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Sauvegarder maintenant
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
