"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deletePatient } from "@/server/patients.actions";

export function DeletePatientButton({
  id,
  label,
  redirectAfter
}: {
  id: string;
  label: string;
  redirectAfter?: string;
}) {
  const router = useRouter();
  return (
    <ConfirmDialog
      destructive
      title="Supprimer le patient ?"
      description={`Cette action est irréversible. Toutes les séances liées à « ${label} » seront aussi supprimées. Les factures déjà émises sont conservées.`}
      confirmLabel="Supprimer"
      trigger={
        <Button variant="ghost" size="icon" aria-label="Supprimer">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      }
      onConfirm={async () => {
        try {
          await deletePatient(id);
          toast.success("Patient supprimé");
          if (redirectAfter) router.push(redirectAfter);
          else router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erreur");
        }
      }}
    />
  );
}
