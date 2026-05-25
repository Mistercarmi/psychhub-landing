"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Save, FileCheck2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateFr, formatEuros } from "@/lib/utils";
import {
  computeFactureTotals,
  type LigneLibre
} from "@/lib/validators/facture";
import {
  updateFactureBrouillon,
  addSeancesToBrouillon,
  removeSeanceFromBrouillon,
  emettreFacture
} from "@/server/factures.actions";

export interface FactureEditorSeance {
  id: string;
  date: string;
  dureeMinutes: number;
  tarif: number;
  statut: string;
}

export interface FactureEditorProps {
  factureId: string;
  initial: {
    tva: number;
    acompte: number;
    notes: string | null;
    dateEcheance: string | null; // ISO
    seances: FactureEditorSeance[];
    lignesLibres: LigneLibre[];
  };
  /** Séances HONOREE du patient, non encore facturées. */
  ajoutables: FactureEditorSeance[];
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function FactureEditor({ factureId, initial, ajoutables }: FactureEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tva, setTva] = useState<number>(initial.tva);
  const [acompte, setAcompte] = useState<number>(initial.acompte);
  const [notes, setNotes] = useState<string>(initial.notes ?? "");
  const [dateEcheance, setDateEcheance] = useState<string>(toDateInput(initial.dateEcheance));
  const [lignesLibres, setLignesLibres] = useState<LigneLibre[]>(initial.lignesLibres);
  const [draftDescription, setDraftDescription] = useState("");
  const [draftMontant, setDraftMontant] = useState<number | "">("");
  const [draftQuantite, setDraftQuantite] = useState<number>(1);
  const [seancesPickerOpen, setSeancesPickerOpen] = useState(false);
  const [pickedSeances, setPickedSeances] = useState<string[]>([]);

  const totals = useMemo(
    () =>
      computeFactureTotals({
        seances: initial.seances,
        lignesLibres,
        tva,
        acompte
      }),
    [initial.seances, lignesLibres, tva, acompte]
  );

  function addLigne() {
    if (!draftDescription.trim() || draftMontant === "" || !Number.isFinite(Number(draftMontant))) {
      toast.error("Description et montant requis");
      return;
    }
    setLignesLibres((prev) => [
      ...prev,
      {
        description: draftDescription.trim(),
        montant: Number(draftMontant),
        quantite: Math.max(1, Math.floor(draftQuantite))
      }
    ]);
    setDraftDescription("");
    setDraftMontant("");
    setDraftQuantite(1);
  }

  function removeLigne(index: number) {
    setLignesLibres((prev) => prev.filter((_, i) => i !== index));
  }

  function saveAll() {
    startTransition(async () => {
      try {
        await updateFactureBrouillon(factureId, {
          tva,
          acompte,
          notes: notes || null,
          dateEcheance: dateEcheance ? new Date(`${dateEcheance}T00:00:00`) : null,
          lignesLibres
        });
        toast.success("Brouillon enregistré");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
      }
    });
  }

  function emettre() {
    if (initial.seances.length === 0 && lignesLibres.length === 0) {
      toast.error("La facture ne contient aucune ligne");
      return;
    }
    startTransition(async () => {
      try {
        // S'assurer que les dernières modifs sont persistées avant émission
        await updateFactureBrouillon(factureId, {
          tva,
          acompte,
          notes: notes || null,
          dateEcheance: dateEcheance ? new Date(`${dateEcheance}T00:00:00`) : null,
          lignesLibres
        });
        await emettreFacture(factureId);
        toast.success("Facture émise");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'émission");
      }
    });
  }

  function handleRemoveSeance(seanceId: string) {
    startTransition(async () => {
      try {
        await removeSeanceFromBrouillon(factureId, seanceId);
        toast.success("Séance retirée");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  function handleAddSeances() {
    if (pickedSeances.length === 0) {
      setSeancesPickerOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        await addSeancesToBrouillon(factureId, pickedSeances);
        toast.success(`${pickedSeances.length} séance(s) ajoutée(s)`);
        setPickedSeances([]);
        setSeancesPickerOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Bandeau d'aide en haut */}
      <div className="flex gap-3 rounded-md border bg-muted/30 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <div className="font-medium">Vous éditez un brouillon de facture</div>
          <div className="text-muted-foreground">
            Tout est modifiable. Quand vous êtes satisfait(e), cliquez sur{" "}
            <strong>« Émettre la facture »</strong> pour la rendre définitive. Une
            facture émise reçoit un numéro figé et ne pourra plus être supprimée
            (seulement annulée).
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Séances incluses</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Les séances honorées que cette facture couvre.
                </p>
              </div>
              <Dialog open={seancesPickerOpen} onOpenChange={setSeancesPickerOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={ajoutables.length === 0}>
                    <Plus className="h-4 w-4" />
                    Ajouter d&apos;autres séances
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Quelles séances ajouter ?</DialogTitle>
                  </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                  {ajoutables.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Aucune séance disponible.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {ajoutables.map((s) => (
                        <li key={s.id} className="flex items-center justify-between py-2">
                          <label className="flex items-center gap-3 text-sm">
                            <Checkbox
                              checked={pickedSeances.includes(s.id)}
                              onCheckedChange={(v) =>
                                setPickedSeances((prev) =>
                                  v === true
                                    ? [...prev, s.id]
                                    : prev.filter((x) => x !== s.id)
                                )
                              }
                            />
                            <span>
                              <span className="font-medium">{formatDateFr(s.date)}</span>{" "}
                              <span className="text-muted-foreground">· {s.dureeMinutes} min</span>
                            </span>
                          </label>
                          <span className="text-sm">{formatEuros(s.tarif)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPickedSeances([]);
                      setSeancesPickerOpen(false);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleAddSeances} disabled={isPending}>
                    Ajouter ({pickedSeances.length})
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date de la séance</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead className="text-right">Tarif</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initial.seances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    Aucune séance dans cette facture pour l&apos;instant.
                    {ajoutables.length > 0 && (
                      <>
                        {" "}
                        Cliquez sur « Ajouter d&apos;autres séances » ci-dessus.
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                initial.seances.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDateFr(s.date)}</TableCell>
                    <TableCell>{s.dureeMinutes} min</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatEuros(s.tarif)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSeance(s.id)}
                        disabled={isPending}
                        aria-label="Retirer cette séance"
                        title="Retirer cette séance de la facture"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ajouter d&apos;autres lignes (optionnel)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Forfait, déplacement, remise, supplément… Tout ce qui n&apos;est pas une
              séance.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {lignesLibres.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20 text-right">Qté</TableHead>
                    <TableHead className="w-32 text-right">Prix unitaire</TableHead>
                    <TableHead className="w-32 text-right">Total</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lignesLibres.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>{l.description}</TableCell>
                      <TableCell className="text-right">{l.quantite ?? 1}</TableCell>
                      <TableCell className="text-right">{formatEuros(l.montant)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEuros(l.montant * (l.quantite ?? 1))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLigne(i)}
                          aria-label="Supprimer ligne"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px_120px_auto]">
              <Input
                placeholder="Description (ex : Déplacement à domicile)"
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
              />
              <Input
                type="number"
                min={1}
                value={draftQuantite}
                onChange={(e) => setDraftQuantite(Number(e.target.value) || 1)}
                aria-label="Quantité"
                placeholder="Qté"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Prix (€)"
                value={draftMontant}
                onChange={(e) =>
                  setDraftMontant(e.target.value === "" ? "" : Number(e.target.value))
                }
                aria-label="Prix unitaire"
              />
              <Button type="button" variant="outline" onClick={addLigne}>
                <Plus className="h-4 w-4" />
                Ajouter cette ligne
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes apparaissant sur la facture (optionnel)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Affiché en bas de la facture PDF. Utile pour le mode de règlement, une
              mention RGPD, ou un message personnalisé pour le patient.
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : Règlement par virement bancaire sous 30 jours…"
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Réglages de la facture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label htmlFor="tva">TVA (%)</Label>
              <Input
                id="tva"
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={tva}
                onChange={(e) => setTva(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Souvent 0 % pour un psychologue libéral
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acompte">Acompte déjà versé (€)</Label>
              <Input
                id="acompte"
                type="number"
                step="0.01"
                min={0}
                value={acompte}
                onChange={(e) => setAcompte(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Sera déduit du total. Laissez 0 si pas d&apos;acompte.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="echeance">Date limite de paiement</Label>
              <Input
                id="echeance"
                type="date"
                value={dateEcheance}
                onChange={(e) => setDateEcheance(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Au-delà, la facture sera marquée « En retard »
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Line label="Sous-total HT" value={formatEuros(totals.montantHT)} />
            <Line
              label={`TVA (${tva}%)`}
              value={formatEuros(totals.montantTVA)}
            />
            <div className="my-2 border-t" />
            <Line label="Total à payer (TTC)" value={formatEuros(totals.montantTTC)} bold />
            {acompte > 0 ? (
              <>
                <Line label="Acompte déjà versé" value={`− ${formatEuros(totals.acompte)}`} />
                <Line label="Reste à payer" value={formatEuros(totals.soldeDu)} bold />
              </>
            ) : null}
          </CardContent>
        </Card>

          <div className="flex flex-col gap-2">
            <Button onClick={saveAll} disabled={isPending} variant="outline">
              <Save className="h-4 w-4" />
              Enregistrer les modifications
            </Button>
            <Button onClick={emettre} disabled={isPending}>
              <FileCheck2 className="h-4 w-4" />
              Émettre la facture
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              ⚠️ Émettre = rendre définitif (numéro figé, plus modifiable)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "text-base font-semibold" : ""}>{value}</span>
    </div>
  );
}
