"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteSeance } from "@/server/seances.actions";

export function DeleteSeanceButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      destructive
      title="Supprimer la séance ?"
      description="Cette action est irréversible. Si la séance est liée à une facture émise, retirez-la de la facture avant suppression."
      confirmLabel="Supprimer"
      trigger={
        <Button variant="ghost" size="icon" aria-label="Supprimer">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      }
      onConfirm={async () => {
        try {
          await deleteSeance(id);
          toast.success("Séance supprimée");
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erreur");
        }
      }}
    />
  );
}
