"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { addPaiement, removePaiement } from "@/server/paiements.actions";
import { formatDateFr, formatEuros } from "@/lib/utils";
import { MODE_LABEL } from "@/lib/factures/statut-labels";

export interface PaiementsPanelProps {
  factureId: string;
  paiements: Array<{
    id: string;
    date: string;
    montant: number;
    mode: string | null;
    reference: string | null;
  }>;
  soldeDu: number;
}

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PaiementsPanel({ factureId, paiements, soldeDu }: PaiementsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [montant, setMontant] = useState<number | "">(soldeDu > 0 ? soldeDu : "");
  const [mode, setMode] = useState<string>("VIREMENT");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(toDateInput(new Date()));

  function handleAdd() {
    if (montant === "" || !Number.isFinite(Number(montant)) || Number(montant) <= 0) {
      toast.error("Montant invalide");
      return;
    }
    startTransition(async () => {
      try {
        await addPaiement({
          factureId,
          montant: Number(montant),
          mode,
          reference: reference || null,
          date: new Date(`${date}T12:00:00`)
        });
        toast.success("Paiement enregistré");
        setMontant("");
        setReference("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      try {
        await removePaiement(id);
        toast.success("Paiement supprimé");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Paiements reçus</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Enregistrez chaque versement du patient (virement, chèque, espèces…)
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {soldeDu > 0 ? "Reste à recevoir :" : "✓ Tout est encaissé :"}{" "}
          <span
            className={
              soldeDu > 0
                ? "font-semibold text-foreground"
                : "font-semibold text-emerald-700 dark:text-emerald-400"
            }
          >
            {formatEuros(soldeDu)}
          </span>
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {paiements.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={Wallet}
            title="Aucun paiement enregistré"
            description="Quand le patient vous paie, ajoutez le versement ci-dessous pour garder une trace claire (utile en comptabilité)."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date du paiement</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDateFr(p.date)}</TableCell>
                  <TableCell>
                    {p.mode ? MODE_LABEL[p.mode] ?? p.mode : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.reference ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatEuros(p.montant)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(p.id)}
                      disabled={isPending}
                      aria-label="Supprimer ce paiement"
                      title="Supprimer ce paiement (erreur de saisie ?)"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {soldeDu > 0 ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-sm font-medium">
              Le patient vient de payer ? Enregistrez-le :
            </p>
            <div className="grid gap-2 sm:grid-cols-[120px_1fr_140px_140px_auto]">
              <div className="space-y-1">
                <Label htmlFor="p-date" className="text-xs">
                  Quel jour ?
                </Label>
                <Input
                  id="p-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-ref" className="text-xs">
                  Référence (optionnel)
                </Label>
                <Input
                  id="p-ref"
                  placeholder="N° de chèque, libellé virement…"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Comment payé ?</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-mnt" className="text-xs">
                  Combien ? (€)
                </Label>
                <Input
                  id="p-mnt"
                  type="number"
                  step="0.01"
                  value={montant}
                  onChange={(e) =>
                    setMontant(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={handleAdd} disabled={isPending}>
                  <Plus className="h-4 w-4" />
                  Enregistrer
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              💡 Si le total des paiements atteint le montant de la facture, elle
              passera automatiquement en « Payée ».
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              ✓ Facture entièrement payée
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Le total des paiements couvre le montant dû.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
