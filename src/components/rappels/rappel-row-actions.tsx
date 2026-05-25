"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marquerRappelEnvoye } from "@/server/rappels.actions";

/**
 * Actions pour une ligne de rappel : télécharger le brouillon `.eml` puis
 * confirmer l'envoi. Le bouton "Marquer comme envoyé" reste actif même sans
 * download (pour les cas où l'utilisateur a déjà copié-collé manuellement).
 */
export function RappelRowActions({ seanceId }: { seanceId: string }) {
  const router = useRouter();
  const [marking, startMarking] = useTransition();
  const [downloaded, setDownloaded] = useState(false);

  function handleMark() {
    startMarking(async () => {
      try {
        const ok = await marquerRappelEnvoye(seanceId);
        if (ok) {
          toast.success("Rappel marqué comme envoyé");
        } else {
          toast.info("Ce rappel était déjà marqué");
        }
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        asChild
        variant="outline"
        size="sm"
        onClick={() => setDownloaded(true)}
      >
        <a href={`/api/mail/rappel-seance/${seanceId}`} download>
          <Download className="h-4 w-4" />
          Préparer le brouillon
        </a>
      </Button>
      <Button
        size="sm"
        variant={downloaded ? "default" : "outline"}
        onClick={handleMark}
        disabled={marking}
        title={
          downloaded
            ? "Enregistrer dans l'historique que ce rappel a été envoyé"
            : "Marquer ce rappel comme envoyé (sans télécharger le brouillon)"
        }
      >
        <CheckCircle2 className="h-4 w-4" />
        {marking ? "Enregistrement…" : "Marquer comme envoyé"}
      </Button>
    </div>
  );
}
