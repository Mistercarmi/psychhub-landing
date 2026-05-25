"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info } from "lucide-react";
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
import { formatDateFr, formatEuros } from "@/lib/utils";
import { createFactureBrouillon } from "@/server/factures.actions";

type PatientOption = { id: string; nom: string; prenom: string };
type SeanceOption = { id: string; date: Date | string; tarif: number; dureeMinutes: number };

export function NouvelleFactureForm({
  trigger,
  patients,
  seancesParPatient
}: {
  trigger: ReactNode;
  patients: PatientOption[];
  seancesParPatient: Record<string, SeanceOption[]>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState<string>(patients[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tva, setTva] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(new Set());
  }, [patientId]);

  const seances = seancesParPatient[patientId] ?? [];
  const total = seances.filter((s) => selected.has(s.id)).reduce((acc, s) => acc + s.tarif, 0);
  const allSelected = seances.length > 0 && selected.size === seances.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(seances.map((s) => s.id)));
    }
  }

  async function submit() {
    if (!patientId || selected.size === 0) {
      toast.error("Sélectionnez au moins une séance à facturer");
      return;
    }
    setBusy(true);
    try {
      const f = await createFactureBrouillon({
        patientId,
        seanceIds: Array.from(selected),
        tva,
        notes
      });
      toast.success("Brouillon créé — vous pouvez maintenant le finaliser");
      setOpen(false);
      router.push(`/factures/${f.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle facture</DialogTitle>
          <DialogDescription>
            Choisissez un patient, cochez les séances honorées à inclure. Un{" "}
            <strong>brouillon</strong> sera créé — vous pourrez encore tout modifier
            avant d&apos;émettre la facture définitive.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Pour quel patient ?</Label>
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                Séances à facturer{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({selected.size}/{seances.length} cochée
                  {selected.size > 1 ? "s" : ""})
                </span>
              </Label>
              {seances.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleAll}
                  className="h-7"
                >
                  {allSelected ? "Tout décocher" : "Tout cocher"}
                </Button>
              )}
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border">
              {seances.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Info className="mx-auto mb-2 h-5 w-5 opacity-50" />
                  <p>Aucune séance à facturer pour ce patient.</p>
                  <p className="mt-1 text-xs">
                    Pour qu&apos;une séance apparaisse ici, elle doit être marquée
                    « Honorée » et ne pas être déjà sur une facture.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {seances.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(s.id);
                          else next.delete(s.id);
                          setSelected(next);
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="flex-1">
                        {formatDateFr(s.date)} · {s.dureeMinutes} min
                      </span>
                      <span className="font-medium tabular-nums">{formatEuros(s.tarif)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {selected.size > 0 && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Total des séances cochées (HT) :
                </span>
                <span className="text-base font-semibold tabular-nums">
                  {formatEuros(total)}
                </span>
              </div>
              {tva > 0 && (
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>TVA ({tva}%) :</span>
                  <span className="tabular-nums">
                    {formatEuros(total * (tva / 100))}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tva">
                TVA (%)
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  0 % par défaut
                </span>
              </Label>
              <Input
                id="tva"
                type="number"
                step="0.01"
                min={0}
                value={tva}
                onChange={(e) => setTva(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Mention spéciale, mode de règlement…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={busy || selected.size === 0}>
            {busy ? "Création…" : "Créer le brouillon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
