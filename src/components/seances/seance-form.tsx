"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { seanceSchema, type SeanceInput } from "@/lib/validators/seance";
import { createSeance, updateSeance } from "@/server/seances.actions";
import { SEANCE_STATUTS } from "@/lib/utils";
import { SEANCE_STATUT_VISUALS } from "@/lib/seance-colors";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type PatientOption = { id: string; nom: string; prenom: string };

type Props = {
  mode: "create" | "edit";
  trigger: ReactNode;
  patients: PatientOption[];
  tarifDefaut: number;
  initial?: Partial<SeanceInput> & { id?: string };
};

function toDatetimeLocal(d?: Date | string) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function SeanceForm({ mode, trigger, patients, tarifDefaut, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SeanceInput>({
    resolver: zodResolver(seanceSchema),
    defaultValues: {
      patientId: initial?.patientId ?? patients[0]?.id ?? "",
      date: (initial?.date as Date | undefined) ?? new Date(),
      dureeMinutes: initial?.dureeMinutes ?? 50,
      tarif: initial?.tarif ?? tarifDefaut,
      statut: initial?.statut ?? "PLANIFIEE",
      notesSeance: initial?.notesSeance ?? ""
    }
  });

  async function onSubmit(values: SeanceInput) {
    setSubmitting(true);
    try {
      if (mode === "create") {
        await createSeance(values);
        toast.success("Séance ajoutée au planning");
      } else if (initial?.id) {
        await updateSeance(initial.id, values);
        toast.success("Séance mise à jour");
      }
      setOpen(false);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Ajouter une nouvelle séance" : "Modifier la séance"}
          </DialogTitle>
          <DialogDescription>
            Le tarif est figé sur cette séance précise. Si vous changez plus tard votre
            tarif par défaut, les séances déjà créées garderont leur ancien montant
            (important pour la facturation).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
          <div className="space-y-1.5">
            <Label>
              Patient <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch("patientId")}
              onValueChange={(v) => form.setValue("patientId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.prenom} {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {patients.length === 0 && (
              <p className="text-xs text-amber-600">
                ⚠️ Aucun patient actif. Créez d&apos;abord un patient.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">
                Jour et heure <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="datetime-local"
                defaultValue={toDatetimeLocal(form.getValues("date"))}
                onChange={(e) => form.setValue("date", new Date(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duree">Durée (en minutes)</Label>
              <Input
                id="duree"
                type="number"
                min={5}
                step={5}
                {...form.register("dureeMinutes")}
              />
              <p className="text-xs text-muted-foreground">Souvent 45 ou 50 min</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tarif">Tarif (€)</Label>
              <Input
                id="tarif"
                type="number"
                step="0.01"
                min={0}
                {...form.register("tarif")}
              />
              <p className="text-xs text-muted-foreground">
                Par défaut : {tarifDefaut.toFixed(2)} € (modifiable dans Paramètres)
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select
                value={form.watch("statut")}
                onValueChange={(v) => form.setValue("statut", v as SeanceInput["statut"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEANCE_STATUTS.map((s) => {
                    const v = SEANCE_STATUT_VISUALS[s];
                    return (
                      <SelectItem key={s} value={s}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: v.hex }}
                          />
                          {v.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {mode === "create"
                  ? "« Planifiée » par défaut"
                  : "Modifiable plus tard depuis la liste"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notesSeance">Notes sur cette séance (optionnel)</Label>
            <Textarea
              id="notesSeance"
              rows={3}
              placeholder="Sujets abordés, observations, points à reprendre la prochaine fois…"
              {...form.register("notesSeance")}
            />
            <p className="text-xs text-muted-foreground">
              Ces notes restent privées et n&apos;apparaissent pas sur la facture.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Enregistrement…"
                : mode === "create"
                  ? "Ajouter au planning"
                  : "Enregistrer les modifications"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
