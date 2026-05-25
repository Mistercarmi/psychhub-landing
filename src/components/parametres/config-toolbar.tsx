"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload, RotateCcw, Mail } from "lucide-react";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { importConfigJson, resetConfigDefaults } from "@/server/config.actions";
import { renderTemplate } from "@/lib/outlook/eml-builder";

export interface ConfigToolbarProps {
  templates: {
    relance: string | null;
    confirmation: string | null;
    rappel: string | null;
  };
  praticienNom: string | null;
  cabinetNom: string | null;
}

const SAMPLE = {
  prenom: "Marie",
  nom: "Durand",
  numero: "F2026-0042",
  montant: "180,00",
  date: "vendredi 16 mai 2026",
  heure: "14:30",
  duree: 50,
  praticien: ""
};

export function ConfigToolbar({ templates, praticienNom, cabinetNom }: ConfigToolbarProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [testOpen, setTestOpen] = useState(false);
  const [testKey, setTestKey] = useState<"relance" | "confirmation" | "rappel">("relance");

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // permet re-import du même fichier
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      startTransition(async () => {
        try {
          const { updatedFields } = await importConfigJson(text);
          toast.success(`${updatedFields} champ(s) importé(s)`);
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erreur d'import");
        }
      });
    };
    reader.readAsText(file);
  }

  function handleReset() {
    startTransition(async () => {
      try {
        await resetConfigDefaults();
        toast.success("Paramètres restaurés aux valeurs par défaut");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  const template =
    testKey === "relance"
      ? templates.relance
      : testKey === "confirmation"
        ? templates.confirmation
        : templates.rappel;

  const preview = template
    ? renderTemplate(template, {
        ...SAMPLE,
        praticien: praticienNom ?? cabinetNom ?? ""
      })
    : "(template vide — saisissez-en un puis enregistrez)";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Mail className="h-4 w-4" />
            Voir un aperçu d&apos;un email
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>À quoi ressemblera un email envoyé ?</DialogTitle>
            <DialogDescription>
              Aperçu avec des données fictives (Marie Durand, facture F2026-0042…)
              pour visualiser le rendu final.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <span className="self-center text-sm text-muted-foreground">Voir :</span>
            {(["confirmation", "relance", "rappel"] as const).map((k) => (
              <Button
                key={k}
                variant={testKey === k ? "default" : "outline"}
                size="sm"
                onClick={() => setTestKey(k)}
              >
                {k === "relance"
                  ? "Relance facture"
                  : k === "confirmation"
                    ? "Confirmation RDV"
                    : "Rappel avant séance"}
              </Button>
            ))}
          </div>
          <Card>
            <CardContent className="pt-4">
              <pre className="whitespace-pre-wrap font-sans text-sm">{preview}</pre>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="outline" asChild>
        <a href="/api/config/export">
          <Download className="h-4 w-4" />
          Sauvegarder mes paramètres (JSON)
        </a>
      </Button>

      <input
        type="file"
        accept="application/json,.json"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button variant="outline" onClick={handleImportClick}>
        <Upload className="h-4 w-4" />
        Restaurer depuis un fichier JSON
      </Button>

      <ConfirmDialog
        destructive
        title="Revenir aux paramètres d'usine ?"
        description="Le nom du cabinet, le nom du praticien, les modèles d'emails et les tarifs par défaut seront effacés. ⚠️ Cette action ne peut pas être annulée. La connexion Google et la configuration des sauvegardes restent intactes."
        confirmLabel="Oui, tout réinitialiser"
        trigger={
          <Button variant="ghost">
            <RotateCcw className="h-4 w-4" />
            Tout réinitialiser
          </Button>
        }
        onConfirm={handleReset}
      />
    </div>
  );
}
