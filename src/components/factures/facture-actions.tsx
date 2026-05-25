"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileDown, Trash2, Undo2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmailPreviewDialog } from "@/components/factures/email-preview-dialog";
import {
  emettreFacture,
  marquerPayee,
  annulerFacture,
  deleteFactureBrouillon
} from "@/server/factures.actions";

export function FactureActions({
  id,
  statut,
  patientHasEmail
}: {
  id: string;
  statut: string;
  patientHasEmail: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const wrap = (fn: () => Promise<unknown>, okMsg: string) => async () => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline">
        <a href={`/api/pdf/facture/${id}`} target="_blank" rel="noreferrer">
          <FileDown className="h-4 w-4" />
          Voir le PDF
        </a>
      </Button>

      {statut === "BROUILLON" && (
        <>
          <ConfirmDialog
            title="Rendre cette facture définitive ?"
            description="Le numéro de facture sera attribué (format YYYY-NNNN) et figé. La facture ne pourra plus être supprimée, seulement annulée. Cette action est irréversible — assurez-vous d'avoir bien vérifié les séances, les montants et la TVA."
            confirmLabel="Oui, émettre la facture"
            trigger={
              <Button disabled={busy}>
                <Send className="h-4 w-4" />
                Émettre la facture
              </Button>
            }
            onConfirm={wrap(() => emettreFacture(id), "Facture émise — numéro attribué")}
          />
          <ConfirmDialog
            destructive
            title="Supprimer ce brouillon ?"
            description="Le brouillon sera supprimé. Les séances qui y étaient rattachées redeviendront facturables (vous pourrez les inclure dans une nouvelle facture)."
            confirmLabel="Supprimer le brouillon"
            trigger={
              <Button variant="ghost" size="icon" disabled={busy} aria-label="Supprimer le brouillon" title="Supprimer ce brouillon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
            onConfirm={wrap(async () => {
              await deleteFactureBrouillon(id);
              router.push("/factures");
            }, "Brouillon supprimé")}
          />
        </>
      )}

      {(statut === "EMISE" || statut === "EN_RETARD") && (
        <>
          <ConfirmDialog
            title="Le patient a payé ?"
            description="La facture sera marquée comme « Payée » à la date d'aujourd'hui. Si le paiement a eu lieu à une autre date, utilisez plutôt la section « Paiements » pour enregistrer le détail (date, mode, référence)."
            confirmLabel="Oui, c'est payé"
            trigger={
              <Button disabled={busy}>
                <CheckCircle2 className="h-4 w-4" />
                Marquer comme payée
              </Button>
            }
            onConfirm={wrap(() => marquerPayee(id), "Facture marquée payée")}
          />
          {patientHasEmail && <EmailPreviewDialog factureId={id} />}
          <ConfirmDialog
            destructive
            title="Annuler cette facture ?"
            description="La facture sera marquée « Annulée » (vous la verrez toujours dans la liste, mais grisée — important pour la comptabilité). Les séances seront à nouveau facturables. ✅ À privilégier plutôt que la suppression."
            confirmLabel="Oui, annuler la facture"
            trigger={
              <Button variant="outline" disabled={busy}>
                <Undo2 className="h-4 w-4" />
                Annuler cette facture
              </Button>
            }
            onConfirm={wrap(() => annulerFacture(id), "Facture annulée")}
          />
        </>
      )}
    </div>
  );
}
