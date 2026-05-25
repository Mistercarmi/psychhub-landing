"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

import { patientSchema, type PatientInput } from "@/lib/validators/patient";
import { createPatient, updatePatient } from "@/server/patients.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  mode: "create" | "edit";
  trigger: ReactNode;
  initial?: Partial<PatientInput> & { id?: string };
};

/** Convertit une date (Date ou ISO string) en valeur YYYY-MM-DD pour input[type=date]. */
function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function PatientForm({ mode, trigger, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PatientInput>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      nom: initial?.nom ?? "",
      prenom: initial?.prenom ?? "",
      dateNaissance: initial?.dateNaissance ?? null,
      email: initial?.email ?? "",
      telephone: initial?.telephone ?? "",
      adresse: initial?.adresse ?? "",
      numeroSecu: initial?.numeroSecu ?? "",
      motifConsult: initial?.motifConsult ?? "",
      notesCliniques: initial?.notesCliniques ?? "",
      actif: initial?.actif ?? true
    }
  });

  async function onSubmit(values: PatientInput) {
    setSubmitting(true);
    try {
      if (mode === "create") {
        await createPatient(values);
        toast.success(`${values.prenom} ${values.nom} ajouté(e) à vos patients`);
      } else if (initial?.id) {
        await updatePatient(initial.id, values);
        toast.success("Fiche patient mise à jour");
      }
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Ajouter un nouveau patient" : "Modifier la fiche patient"}
          </DialogTitle>
          <DialogDescription className="flex items-start gap-2 pt-1">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Les données restent <strong>sur votre ordinateur</strong>. Aucune
              information n&apos;est envoyée à un service externe sans votre action
              explicite.
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          {/* Identité */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Identité
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nom">
                  Nom de famille <span className="text-destructive">*</span>
                </Label>
                <Input id="nom" placeholder="Dupont" {...form.register("nom")} />
                {form.formState.errors.nom && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.nom.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prenom">
                  Prénom <span className="text-destructive">*</span>
                </Label>
                <Input id="prenom" placeholder="Marie" {...form.register("prenom")} />
                {form.formState.errors.prenom && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.prenom.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateNaissance">Date de naissance</Label>
                <Input
                  id="dateNaissance"
                  type="date"
                  defaultValue={toDateInput(initial?.dateNaissance)}
                  onChange={(e) => {
                    const v = e.target.value;
                    form.setValue(
                      "dateNaissance",
                      v ? new Date(`${v}T00:00:00`) : null
                    );
                  }}
                />
                <p className="text-xs text-muted-foreground">Optionnel</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numeroSecu">N° de Sécurité sociale</Label>
                <Input
                  id="numeroSecu"
                  inputMode="numeric"
                  placeholder="1 85 05 78 006 048 22"
                  {...form.register("numeroSecu")}
                />
                {form.formState.errors.numeroSecu ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.numeroSecu.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    13 ou 15 chiffres — vérifié automatiquement (clé INSEE)
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Coordonnées */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Coordonnées
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="marie.dupont@email.fr"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  {...form.register("telephone")}
                />
                {form.formState.errors.telephone && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.telephone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adresse">Adresse postale</Label>
              <Input
                id="adresse"
                placeholder="12 rue de la Paix, 75002 Paris"
                {...form.register("adresse")}
              />
            </div>
          </section>

          {/* Suivi */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Suivi clinique
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="motif">Motif de consultation</Label>
              <Textarea
                id="motif"
                rows={2}
                placeholder="Ex : Anxiété, troubles du sommeil, suivi post-thérapie…"
                {...form.register("motifConsult")}
              />
              <p className="text-xs text-muted-foreground">
                Visible en tête de la fiche patient
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes cliniques (court résumé)</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Note rapide. Pour des notes détaillées (Markdown, mise en forme), utilisez l'éditeur dédié sur la fiche du patient."
                {...form.register("notesCliniques")}
              />
              <p className="text-xs text-muted-foreground">
                💡 La fiche patient propose un <strong>éditeur de notes complet</strong>{" "}
                (gras, italique, titres, listes, aperçu).
              </p>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Enregistrement…"
                : mode === "create"
                  ? "Créer la fiche patient"
                  : "Enregistrer les modifications"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
