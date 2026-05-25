"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Database,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { runDatabaseIntegrityCheck } from "@/server/backup-integrity.actions";
import type { DbIntegrityResult } from "@/lib/backup/db-integrity";

type Props = {
  initial: DbIntegrityResult | null;
};

const STATUS_META = {
  ok: {
    label: "Base saine",
    icon: ShieldCheck,
    badgeClass: "border-emerald-300 bg-emerald-50 text-emerald-700",
    iconClass: "text-emerald-600",
    helpText: "SQLite a vérifié toutes ses pages internes. Aucune corruption détectée."
  },
  corrupt: {
    label: "Corruption détectée",
    icon: ShieldAlert,
    badgeClass: "border-red-300 bg-red-50 text-red-700",
    iconClass: "text-red-600",
    helpText:
      "SQLite a détecté des incohérences. Restaurez immédiatement depuis votre dernière sauvegarde et arrêtez toute écriture."
  },
  error: {
    label: "Erreur de vérification",
    icon: ShieldOff,
    badgeClass: "border-amber-300 bg-amber-50 text-amber-700",
    iconClass: "text-amber-600",
    helpText:
      "Impossible de lancer la vérification. La base est peut-être verrouillée ou indisponible."
  }
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short"
  });
}

export function DatabaseHealthCard({ initial }: Props) {
  const [result, setResult] = useState<DbIntegrityResult | null>(initial);
  const [showDetails, setShowDetails] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCheck() {
    startTransition(async () => {
      try {
        const next = await runDatabaseIntegrityCheck();
        setResult(next);
        if (next.status === "ok") {
          toast.success("Vérification terminée — base saine");
        } else if (next.status === "corrupt") {
          toast.error("Corruption détectée — restaurez une sauvegarde");
        } else {
          toast.error("Vérification impossible");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  const meta = result ? STATUS_META[result.status] : null;
  const Icon = meta?.icon ?? Database;

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-start gap-3">
        <Icon
          className={`mt-0.5 h-5 w-5 shrink-0 ${meta?.iconClass ?? "text-muted-foreground"}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">Intégrité de la base de données</div>
            {meta && (
              <Badge variant="outline" className={meta.badgeClass}>
                {meta.label}
              </Badge>
            )}
            {!result && (
              <Badge variant="outline">Pas encore vérifiée</Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {meta?.helpText ??
              "Lance une vérification interne SQLite (PRAGMA integrity_check) pour détecter une éventuelle corruption silencieuse du fichier de base."}
          </p>

          {result && (
            <div className="text-xs text-muted-foreground">
              Dernière vérification : <strong>{formatDate(result.checkedAt)}</strong>
              {" · "}
              {result.durationMs} ms
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheck}
              disabled={isPending}
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              {isPending
                ? "Vérification en cours…"
                : result
                  ? "Relancer la vérification"
                  : "Vérifier la base maintenant"}
            </Button>
            {result && result.details.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetails((v) => !v)}
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Masquer les détails techniques
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Afficher les détails techniques
                  </>
                )}
              </Button>
            )}
          </div>

          {showDetails && result && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
              {result.details.join("\n")}
            </pre>
          )}

          <div className="mt-3 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
            🔒 Cette vérification est lancée automatiquement à chaque démarrage de
            PsychHub. Vous pouvez la relancer manuellement en cas de doute (coupure de
            courant, plantage, fichier copié à chaud, etc.).
          </div>
        </div>
      </div>
    </div>
  );
}
