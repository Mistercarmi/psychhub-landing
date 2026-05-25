"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Repeat } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createSeancesRecurrentes,
  type RecurrenceFrequency
} from "@/server/seances.actions";

type PatientOption = { id: string; nom: string; prenom: string };

export interface RecurrenceFormProps {
  patients: PatientOption[];
  tarifDefaut: number;
  trigger?: ReactNode;
}

const FREQ_LABELS: Record<RecurrenceFrequency, string> = {
  weekly: "Chaque semaine, le même jour",
  biweekly: "Toutes les 2 semaines, le même jour",
  monthly: "Chaque mois, à la même date"
};

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RecurrenceForm({ patients, tarifDefaut, trigger }: RecurrenceFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [date, setDate] = useState(() => toDatetimeLocal(new Date()));
  const [duree, setDuree] = useState(50);
  const [tarif, setTarif] = useState(tarifDefaut);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [endMode, setEndMode] = useState<"count" | "until">("count");
  const [count, setCount] = useState(10);
  const [until, setUntil] = useState("");
  const [bypassConflict, setBypassConflict] = useState(false);

  async function submit() {
    if (!patientId) {
      toast.error("Sélectionnez un patient");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createSeancesRecurrentes(
        {
          patientId,
          date: new Date(date),
          dureeMinutes: duree,
          tarif,
          statut: "PLANIFIEE"
        },
        {
          frequency,
          count: endMode === "count" ? count : undefined,
          until: endMode === "until" && until ? new Date(`${until}T23:59:59`) : undefined,
          includeFirst: true
        },
        { bypassConflictCheck: bypassConflict }
      );
      toast.success(
        `${result.created} séance${result.created > 1 ? "s" : ""} créée${result.created > 1 ? "s" : ""}` +
          (result.skipped > 0 ? ` · ${result.skipped} en conflit ignorée${result.skipped > 1 ? "s" : ""}` : "")
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Repeat className="h-4 w-4" />
            Créer plusieurs séances d&apos;un coup
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une série de séances récurrentes</DialogTitle>
          <DialogDescription>
            Pratique pour un patient qui vient toutes les semaines ou tous les 15
            jours. Génère plusieurs séances en une seule action. Les créneaux où
            vous avez déjà un autre rendez-vous sont automatiquement écartés.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>
              Pour quel patient ? <span className="text-destructive">*</span>
            </Label>
            <Select value={patientId} onValueChange={setPatientId}>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-date">
                Date du 1er rendez-vous <span className="text-destructive">*</span>
              </Label>
              <Input
                id="r-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-duree">Durée de chaque séance (min)</Label>
              <Input
                id="r-duree"
                type="number"
                value={duree}
                min={1}
                onChange={(e) => setDuree(Number(e.target.value) || 50)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-tarif">Tarif par séance (€)</Label>
              <Input
                id="r-tarif"
                type="number"
                step="0.01"
                value={tarif}
                onChange={(e) => setTarif(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>À quelle fréquence ?</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQ_LABELS) as RecurrenceFrequency[]).map((f) => (
                    <SelectItem key={f} value={f}>
                      {FREQ_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Quand s&apos;arrêter ?</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={endMode} onValueChange={(v) => setEndMode(v as "count" | "until")}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Après un nombre de séances</SelectItem>
                  <SelectItem value="until">Jusqu&apos;à une date précise</SelectItem>
                </SelectContent>
              </Select>
              {endMode === "count" ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">séances au total</span>
                </div>
              ) : (
                <Input
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className="w-44"
                />
              )}
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
            <Checkbox
              checked={bypassConflict}
              onCheckedChange={(v) => setBypassConflict(v === true)}
              className="mt-0.5"
            />
            <span className="flex-1">
              <span className="font-medium">Créer quand même</span>
              <span className="text-muted-foreground">
                {" "}
                si un créneau est déjà occupé par une autre séance.{" "}
              </span>
              <span className="text-xs text-muted-foreground">
                Par défaut, les créneaux en conflit sont ignorés pour éviter les
                doublons. Cochez seulement si vous comprenez le risque.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? "Création…" : "Créer toutes les séances"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
