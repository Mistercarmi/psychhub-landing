import Link from "next/link";
import { Plus, AlertCircle, FileText, CheckCircle2, Clock } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
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
import { NouvelleFactureForm } from "@/components/factures/nouvelle-facture-form";
import { listFactures } from "@/server/factures.actions";
import { prisma } from "@/lib/db";
import { formatDateFr, formatEuros } from "@/lib/utils";
import { PageWithEditor } from "@/components/editor/page-with-editor";
import { ModulesDataProvider } from "@/editor/context/modules-data-context";
import { getFacturesModulesData } from "@/server/modules-data.actions";
import { getLayout } from "@/server/layouts.actions";
import {
  factureStatutLabel,
  factureStatutVariant
} from "@/lib/factures/statut-labels";

export default async function FacturesPage() {
  const [factures, patients, seancesFacturables, modulesData, savedLayout] = await Promise.all([
    listFactures(),
    prisma.patient.findMany({
      where: { actif: true },
      select: { id: true, nom: true, prenom: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }]
    }),
    prisma.seance.findMany({
      where: { statut: "HONOREE", factureId: null },
      orderBy: { date: "desc" },
      select: { id: true, date: true, tarif: true, dureeMinutes: true, patientId: true }
    }),
    getFacturesModulesData(),
    getLayout("factures")
  ]);

  const seancesParPatient: Record<string, typeof seancesFacturables> = {};
  for (const s of seancesFacturables) {
    (seancesParPatient[s.patientId] ??= []).push(s);
  }

  // Stats utiles en haut de page
  const stats = {
    impayees: factures.filter((f) => f.statut === "EMISE" || f.statut === "EN_RETARD"),
    enRetard: factures.filter((f) => f.statut === "EN_RETARD"),
    payees: factures.filter((f) => f.statut === "PAYEE"),
    brouillons: factures.filter((f) => f.statut === "BROUILLON")
  };
  const montantImpaye = stats.impayees.reduce((acc, f) => acc + f.montantTTC, 0);
  const montantEnRetard = stats.enRetard.reduce((acc, f) => acc + f.montantTTC, 0);

  return (
    <>
      <Topbar title="Factures" showEditorToggle />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <ModulesDataProvider data={{ factures: modulesData }}>
          <PageWithEditor tabKey="factures" initialLayout={savedLayout} fallback={null} />
        </ModulesDataProvider>

        {/* Bandeau de stats — toujours visible */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<AlertCircle className="h-5 w-5 text-destructive" />}
            label="En retard"
            value={stats.enRetard.length}
            sub={montantEnRetard > 0 ? `${formatEuros(montantEnRetard)} à recevoir` : "Aucune en retard"}
            tone="danger"
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            label="À encaisser"
            value={stats.impayees.length}
            sub={montantImpaye > 0 ? `${formatEuros(montantImpaye)} au total` : "Tout est encaissé"}
            tone={stats.impayees.length > 0 ? "warning" : "default"}
          />
          <StatCard
            icon={<FileText className="h-5 w-5 text-muted-foreground" />}
            label="Brouillons"
            value={stats.brouillons.length}
            sub={
              stats.brouillons.length > 0
                ? "À finaliser et émettre"
                : "Aucun brouillon en cours"
            }
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            label="Payées"
            value={stats.payees.length}
            sub={`${formatEuros(stats.payees.reduce((a, f) => a + f.montantTTC, 0))} encaissés`}
          />
        </div>

        {/* Barre d'action */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {factures.length} facture{factures.length > 1 ? "s" : ""} au total
          </p>
          <NouvelleFactureForm
            patients={patients}
            seancesParPatient={seancesParPatient}
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Créer une nouvelle facture
              </Button>
            }
          />
        </div>

        {/* Liste */}
        <Card>
          {factures.length === 0 ? (
            <div className="space-y-3 py-16 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">Aucune facture pour l&apos;instant</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Créez votre première facture à partir des séances honorées d&apos;un patient.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° de facture</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date d&apos;émission</TableHead>
                  <TableHead className="text-center">Séances</TableHead>
                  <TableHead className="text-right">Montant TTC</TableHead>
                  <TableHead>État</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factures.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Link
                        href={`/factures/${f.id}`}
                        className="font-medium hover:underline"
                      >
                        {f.numero}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/patients/${f.patient.id}`}
                        className="hover:underline"
                      >
                        {f.patient.prenom} {f.patient.nom}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDateFr(f.dateEmission)}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      {f._count.seances}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatEuros(f.montantTTC)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={factureStatutVariant(f.statut)}>
                        {factureStatutLabel(f.statut)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "default"
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-destructive/30 bg-destructive/5"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/5"
        : "";
  return (
    <Card className={toneClass}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-xs font-medium">{label}</div>
          <div className="truncate text-xs text-muted-foreground">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}
