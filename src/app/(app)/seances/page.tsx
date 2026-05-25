import Link from "next/link";
import {
  Plus,
  Upload,
  CalendarDays,
  Calendar as CalendarIcon,
  Bell,
  CalendarCheck,
  CalendarClock,
  Activity
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { SeanceForm } from "@/components/seances/seance-form";
import { DeleteSeanceButton } from "@/components/seances/delete-seance-button";
import { StatutSelect } from "@/components/seances/statut-select";
import { DuplicateSeanceButton } from "@/components/seances/duplicate-seance-button";
import { CalendarView, type CalendarSeance } from "@/components/seances/calendar-view";
import { RecurrenceForm } from "@/components/seances/recurrence-form";
import { listSeances } from "@/server/seances.actions";
import { prisma } from "@/lib/db";
import { formatDateTimeFr, formatEuros, type SeanceStatut } from "@/lib/utils";
import { PageWithEditor } from "@/components/editor/page-with-editor";
import { ModulesDataProvider } from "@/editor/context/modules-data-context";
import { getSeancesModulesData } from "@/server/modules-data.actions";
import { getLayout } from "@/server/layouts.actions";

export const dynamic = "force-dynamic";

export default async function SeancesPage({
  searchParams
}: {
  searchParams: { view?: string; date?: string };
}) {
  const view = (searchParams.view ?? "list") as "list" | "day" | "week" | "month";

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);
  // Lundi = début de semaine (FR)
  const dayOfWeek = startOfDay.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(startOfDay.getTime() - daysFromMonday * 86_400_000);
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86_400_000);

  const [
    seances,
    patients,
    config,
    modulesData,
    savedLayout,
    seancesAujourdhui,
    seancesCetteSemaine,
    seancesAVenir
  ] = await Promise.all([
    listSeances(),
    prisma.patient.findMany({
      where: { actif: true },
      select: { id: true, nom: true, prenom: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }]
    }),
    prisma.config.findUnique({ where: { id: "default" } }),
    getSeancesModulesData(),
    getLayout("seances"),
    prisma.seance.count({
      where: {
        date: { gte: startOfDay, lt: endOfDay },
        statut: { not: "ANNULEE_PATIENT" }
      }
    }),
    prisma.seance.count({
      where: {
        date: { gte: startOfWeek, lt: endOfWeek }
      }
    }),
    prisma.seance.count({
      where: { date: { gte: now }, statut: "PLANIFIEE" }
    })
  ]);

  const tarifDefaut = config?.tarifDefaut ?? 60;

  // Préparation des données pour CalendarView (sérialisable)
  const calendarSeances: CalendarSeance[] = seances.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    dureeMinutes: s.dureeMinutes,
    statut: s.statut,
    patientPrenom: s.patient.prenom,
    patientNom: s.patient.nom,
    tarif: s.tarif
  }));

  const initialDate = searchParams.date ? new Date(`${searchParams.date}T12:00:00`) : undefined;

  return (
    <>
      <Topbar title="Séances" showEditorToggle />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <ModulesDataProvider data={{ seances: modulesData }}>
          <PageWithEditor tabKey="seances" initialLayout={savedLayout} fallback={null} />
        </ModulesDataProvider>

        {/* Bandeau stats — vue rapide du planning */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<CalendarDays className="h-5 w-5 text-primary" />}
            label="Aujourd'hui"
            value={seancesAujourdhui}
            sub={
              seancesAujourdhui === 0
                ? "Pas de séance prévue"
                : seancesAujourdhui === 1
                  ? "séance prévue"
                  : "séances prévues"
            }
          />
          <StatCard
            icon={<CalendarCheck className="h-5 w-5 text-emerald-600" />}
            label="Cette semaine"
            value={seancesCetteSemaine}
            sub="Du lundi au dimanche"
          />
          <StatCard
            icon={<CalendarClock className="h-5 w-5 text-amber-600" />}
            label="À venir (planifiées)"
            value={seancesAVenir}
            sub="Tous statuts confondus"
          />
          <StatCard
            icon={<Activity className="h-5 w-5 text-muted-foreground" />}
            label="Total dans la base"
            value={seances.length}
            sub="Historique complet"
          />
        </div>

        {/* Barre vue + actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={view}>
            <TabsList>
              <TabsTrigger value="list" asChild>
                <Link href="/seances?view=list">Liste</Link>
              </TabsTrigger>
              <TabsTrigger value="day" asChild>
                <Link href="/seances?view=day">
                  <CalendarDays className="mr-1 h-3.5 w-3.5" />
                  Jour
                </Link>
              </TabsTrigger>
              <TabsTrigger value="week" asChild>
                <Link href="/seances?view=week">Semaine</Link>
              </TabsTrigger>
              <TabsTrigger value="month" asChild>
                <Link href="/seances?view=month">Mois</Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              title="Lien d'abonnement iCal pour synchroniser ce calendrier avec Apple Calendar, Google Agenda, Outlook…"
            >
              <a href="/api/calendar/ics" target="_blank" rel="noreferrer">
                <CalendarIcon className="h-4 w-4" />
                Lien iCal
              </a>
            </Button>
            <RecurrenceForm patients={patients} tarifDefaut={tarifDefaut} />
            <Button variant="outline" asChild>
              <Link href="/seances/import">
                <Upload className="h-4 w-4" />
                Importer depuis Doctolib
              </Link>
            </Button>
            <SeanceForm
              mode="create"
              patients={patients}
              tarifDefaut={tarifDefaut}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Ajouter une séance
                </Button>
              }
            />
          </div>
        </div>

        {view === "list" ? (
          <Card>
            {seances.length === 0 ? (
              <div className="space-y-3 py-16 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium">Aucune séance pour l&apos;instant</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ajoutez votre première séance manuellement, créez une série
                    récurrente, ou importez votre planning depuis Doctolib.
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date et heure</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead className="text-right">Tarif</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Facture</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seances.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{formatDateTimeFr(s.date)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/patients/${s.patient.id}`}
                          className="font-medium hover:underline"
                        >
                          {s.patient.prenom} {s.patient.nom}
                        </Link>
                      </TableCell>
                      <TableCell>{s.dureeMinutes} min</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatEuros(s.tarif)}
                      </TableCell>
                      <TableCell>
                        <StatutSelect seanceId={s.id} initial={s.statut as SeanceStatut} />
                      </TableCell>
                      <TableCell>
                        {s.facture ? (
                          <Badge variant="secondary" title="Cette séance est sur une facture">
                            {s.facture.numero}
                          </Badge>
                        ) : s.statut === "HONOREE" ? (
                          <span
                            className="text-xs text-amber-600"
                            title="Séance honorée mais pas encore facturée"
                          >
                            À facturer
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="flex justify-end gap-1">
                        {s.patient.email ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            aria-label="Envoyer un rappel par email"
                            title="Préparer un brouillon d'email de rappel pour ce patient"
                          >
                            <a href={`/api/mail/rappel-seance/${s.id}`}>
                              <Bell className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}
                        <DuplicateSeanceButton id={s.id} />
                        <SeanceForm
                          mode="edit"
                          patients={patients}
                          tarifDefaut={tarifDefaut}
                          initial={{
                            id: s.id,
                            patientId: s.patientId,
                            date: s.date,
                            dureeMinutes: s.dureeMinutes,
                            tarif: s.tarif,
                            statut: s.statut as never,
                            notesSeance: s.notesSeance ?? ""
                          }}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Modifier
                            </Button>
                          }
                        />
                        <DeleteSeanceButton id={s.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        ) : (
          <CalendarView
            seances={calendarSeances}
            initialDate={initialDate}
            initialView={view as "day" | "week" | "month"}
          />
        )}
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <Card>
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
