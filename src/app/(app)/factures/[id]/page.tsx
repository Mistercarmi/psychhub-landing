import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info, MailCheck } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { FactureActions } from "@/components/factures/facture-actions";
import {
  FactureEditor,
  type FactureEditorSeance
} from "@/components/factures/facture-editor";
import { getFacture, getSeancesFacturablesPatient } from "@/server/factures.actions";
import { listPaiements, getFactureSolde } from "@/server/paiements.actions";
import { getRelancesHistory } from "@/server/relances.actions";
import { PaiementsPanel } from "@/components/factures/paiements-panel";
import { formatDateFr, formatEuros } from "@/lib/utils";
import { ligneLibreSchema, type LigneLibre } from "@/lib/validators/facture";
import {
  factureStatutLabel,
  factureStatutVariant,
  factureStatutHelp,
  modePaiementLabel
} from "@/lib/factures/statut-labels";

export const dynamic = "force-dynamic";

function parseLignes(raw: string | null): LigneLibre[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => ligneLibreSchema.safeParse(x))
      .filter((r) => r.success)
      .map((r) => (r as { data: LigneLibre }).data);
  } catch {
    return [];
  }
}

export default async function FactureDetailPage({ params }: { params: { id: string } }) {
  const facture = await getFacture(params.id);
  if (!facture) notFound();

  const isBrouillon = facture.statut === "BROUILLON";
  const [ajoutables, paiements, solde, relancesHistory] = await Promise.all([
    isBrouillon ? getSeancesFacturablesPatient(facture.patientId) : Promise.resolve([]),
    !isBrouillon && facture.statut !== "ANNULEE"
      ? listPaiements(facture.id)
      : Promise.resolve([]),
    !isBrouillon && facture.statut !== "ANNULEE"
      ? getFactureSolde(facture.id)
      : Promise.resolve(null),
    !isBrouillon ? getRelancesHistory(facture.id) : Promise.resolve([])
  ]);

  const seancesForEditor: FactureEditorSeance[] = facture.seances.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    dureeMinutes: s.dureeMinutes,
    tarif: s.tarif,
    statut: s.statut
  }));
  const ajoutablesForEditor: FactureEditorSeance[] = ajoutables.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    dureeMinutes: s.dureeMinutes,
    tarif: s.tarif,
    statut: s.statut
  }));

  const lignesLibres = parseLignes(facture.lignesLibres);
  const helpText = factureStatutHelp(facture.statut);

  return (
    <>
      <Topbar
        title={
          isBrouillon ? "Brouillon de facture" : `Facture ${facture.numero}`
        }
      />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/factures">
              <ArrowLeft className="h-4 w-4" />
              Retour à la liste des factures
            </Link>
          </Button>
          <FactureActions
            id={facture.id}
            statut={facture.statut}
            patientHasEmail={!!facture.patient.email}
          />
        </div>

        {/* Carte d'en-tête : récap + état + aide contextuelle */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>
                  {isBrouillon
                    ? "Brouillon non émis"
                    : `Facture ${facture.numero}`}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pour{" "}
                  <Link
                    href={`/patients/${facture.patient.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {facture.patient.prenom} {facture.patient.nom}
                  </Link>
                </p>
              </div>
              <Badge
                variant={factureStatutVariant(facture.statut)}
                className="text-sm"
              >
                {factureStatutLabel(facture.statut)}
              </Badge>
            </div>
            {helpText && (
              <div className="mt-3 flex gap-2 rounded-md border bg-muted/30 p-3 text-xs">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">{helpText}</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 border-t pt-4 text-sm md:grid-cols-4">
            <Info_
              label="Email patient"
              value={facture.patient.email ?? "Pas d'email"}
            />
            <Info_ label="Émise le" value={formatDateFr(facture.dateEmission)} />
            <Info_
              label="Date limite de paiement"
              value={facture.dateEcheance ? formatDateFr(facture.dateEcheance) : "—"}
            />
            <Info_
              label="Payée le"
              value={facture.datePaiement ? formatDateFr(facture.datePaiement) : "—"}
            />
            <Info_
              label="Mode de paiement"
              value={modePaiementLabel(facture.modePaiement)}
            />
            <Info_
              label="Acompte versé"
              value={facture.acompte ? formatEuros(facture.acompte) : "Aucun"}
            />
            <Info_
              label="Total TTC"
              value={formatEuros(facture.montantTTC)}
              strong
            />
          </CardContent>
        </Card>

        {isBrouillon ? (
          <FactureEditor
            factureId={facture.id}
            initial={{
              tva: facture.tva,
              acompte: facture.acompte,
              notes: facture.notes,
              dateEcheance: facture.dateEcheance ? facture.dateEcheance.toISOString() : null,
              seances: seancesForEditor,
              lignesLibres
            }}
            ajoutables={ajoutablesForEditor}
          />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Séances facturées</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead className="text-right">Tarif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facture.seances.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{formatDateFr(s.date)}</TableCell>
                      <TableCell>{s.dureeMinutes} min</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatEuros(s.tarif)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {lignesLibres.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Autres lignes</CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">Prix unitaire</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lignesLibres.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell>{l.description}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {l.quantite ?? 1}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEuros(l.montant)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEuros(l.montant * (l.quantite ?? 1))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Line label="Sous-total HT" value={formatEuros(facture.montantHT)} />
                <Line
                  label={`TVA (${facture.tva}%)`}
                  value={formatEuros(facture.montantTTC - facture.montantHT)}
                />
                <div className="my-2 border-t" />
                <Line label="Total à payer (TTC)" value={formatEuros(facture.montantTTC)} bold />
                {facture.acompte > 0 ? (
                  <>
                    <Line label="Acompte déjà versé" value={`− ${formatEuros(facture.acompte)}`} />
                    <Line
                      label="Reste à payer"
                      value={formatEuros(Math.max(0, facture.montantTTC - facture.acompte))}
                      bold
                    />
                  </>
                ) : null}
              </CardContent>
            </Card>

            {solde && facture.statut !== "ANNULEE" ? (
              <PaiementsPanel
                factureId={facture.id}
                paiements={paiements}
                soldeDu={solde.soldeDu}
              />
            ) : null}

            {relancesHistory.length > 0 ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MailCheck className="h-5 w-5 text-amber-600" />
                    <CardTitle>Historique des relances</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Relances déjà marquées comme envoyées au patient. Évite les doubles
                    envois.
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {relancesHistory
                      .slice()
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((h, i) => (
                        <li
                          key={`${h.palier}-${h.date}-${i}`}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                          >
                            Palier J+{h.palier}
                          </Badge>
                          <span className="text-muted-foreground">
                            envoyée le{" "}
                            <strong className="text-foreground">
                              {formatDateFr(new Date(h.date))}
                            </strong>
                          </span>
                        </li>
                      ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {facture.notes ? (
              <Card>
                <CardHeader>
                  <CardTitle>Notes inscrites sur la facture</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{facture.notes}</p>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

function Info_({
  label,
  value,
  strong
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={strong ? "text-base font-semibold tabular-nums" : "font-medium"}>
        {value}
      </div>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "text-base font-semibold tabular-nums" : "tabular-nums"}>
        {value}
      </span>
    </div>
  );
}
