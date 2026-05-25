"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { marquerRelanceEnvoyeeUI } from "@/server/relances.actions";

export interface EmailPreviewDialogProps {
  factureId: string;
}

interface PreviewData {
  to: string;
  from: string | null;
  subject: string;
  body: string;
  isRelance: boolean;
}

export function EmailPreviewDialog({ factureId }: EmailPreviewDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [marking, startMarking] = useTransition();
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setDownloaded(false);
    fetch(`/api/mail/draft/${factureId}/preview`)
      .then(async (r) => {
        if (!r.ok) {
          const json = await r.json().catch(() => ({}));
          throw new Error(json.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d: PreviewData) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, factureId]);

  function handleConfirmRelance() {
    startMarking(async () => {
      try {
        const paliers = await marquerRelanceEnvoyeeUI(factureId);
        if (paliers.length === 0) {
          toast.info("Tous les paliers étaient déjà marqués");
        } else {
          toast.success(
            `Relance marquée comme envoyée (palier${paliers.length > 1 ? "s" : ""} J+${paliers.join(", J+")})`
          );
        }
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Mail className="h-4 w-4" />
          Brouillon mail
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aperçu du brouillon email</DialogTitle>
          <DialogDescription>
            Vérifiez le contenu avant d&apos;ouvrir le brouillon dans votre client mail. Le PDF de la
            facture sera joint automatiquement.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Génération…</p>
        ) : error ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-start gap-2 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <span>{error}</span>
            </CardContent>
          </Card>
        ) : data ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-[80px_1fr] gap-2">
              <span className="text-muted-foreground">De</span>
              <span className="font-mono text-xs">{data.from ?? "(non configuré)"}</span>
              <span className="text-muted-foreground">À</span>
              <span className="font-mono text-xs">{data.to}</span>
              <span className="text-muted-foreground">Sujet</span>
              <span className="font-medium">{data.subject}</span>
              <span className="text-muted-foreground">Type</span>
              <span>
                {data.isRelance ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    Relance
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Envoi initial</span>
                )}
              </span>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <pre className="whitespace-pre-wrap font-sans text-sm">{data.body}</pre>
            </div>
            <p className="text-xs text-muted-foreground">
              Le template est défini dans Paramètres → Templates email. Variables disponibles :
              <code className="ml-1">{"{{prenom}}, {{nom}}, {{numero}}, {{montant}}, {{praticien}}"}</code>
            </p>
          </div>
        ) : null}

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button asChild disabled={!data} onClick={() => setDownloaded(true)}>
              <a href={`/api/mail/draft/${factureId}`} download>
                <Download className="h-4 w-4" />
                Ouvrir le brouillon .eml
              </a>
            </Button>
            {data?.isRelance && (
              <Button
                variant="default"
                disabled={!data || marking || !downloaded}
                onClick={handleConfirmRelance}
                title={
                  downloaded
                    ? "Enregistrer dans l'historique que cette relance a été envoyée"
                    : "Téléchargez d'abord le brouillon .eml ci-dessus"
                }
              >
                <CheckCircle2 className="h-4 w-4" />
                {marking ? "Enregistrement…" : "J'ai envoyé cette relance"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
