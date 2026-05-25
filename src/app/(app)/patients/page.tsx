import { Plus, Users, UserPlus, UserMinus, Clock } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/components/patients/patient-form";
import { PatientsFilters } from "@/components/patients/patients-filters";
import { PatientsTable } from "@/components/patients/patients-table";
import { listPatients } from "@/server/patients.actions";
import { listTags } from "@/server/tags.actions";
import { rangeFromSearchParams } from "@/lib/date-range";
import { PageWithEditor } from "@/components/editor/page-with-editor";
import { ModulesDataProvider } from "@/editor/context/modules-data-context";
import { getPatientsModulesData } from "@/server/modules-data.actions";
import { getLayout } from "@/server/layouts.actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams
}: {
  searchParams: {
    q?: string;
    actif?: string;
    tags?: string;
    from?: string;
    to?: string;
    preset?: string;
  };
}) {
  const { range } = rangeFromSearchParams({
    from: searchParams.from,
    to: searchParams.to,
    preset: searchParams.preset
  });
  const tagIds = (searchParams.tags ?? "").split(",").filter(Boolean);
  const actif =
    searchParams.actif === "true" ? true : searchParams.actif === "false" ? false : undefined;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

  const [
    patients,
    tags,
    modulesData,
    savedLayout,
    totalActifs,
    totalInactifs,
    nouveauxCeMois,
    inactifsRelance
  ] = await Promise.all([
    listPatients({
      q: searchParams.q,
      actif,
      tagIds: tagIds.length > 0 ? tagIds : undefined,
      hasSeanceFrom: range?.from,
      hasSeanceTo: range?.to
    }),
    listTags(),
    getPatientsModulesData(),
    getLayout("patients"),
    prisma.patient.count({ where: { actif: true } }),
    prisma.patient.count({ where: { actif: false } }),
    prisma.patient.count({ where: { createdAt: { gte: startOfMonth } } }),
    // Patients actifs n'ayant eu aucune séance HONOREE dans les 90 derniers jours
    prisma.patient.count({
      where: {
        actif: true,
        seances: { none: { statut: "HONOREE", date: { gte: ninetyDaysAgo } } }
      }
    })
  ]);

  const hasActiveFilters =
    Boolean(searchParams.q) ||
    actif !== undefined ||
    tagIds.length > 0 ||
    Boolean(range);

  return (
    <>
      <Topbar title="Patients" showEditorToggle />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <ModulesDataProvider data={{ patients: modulesData }}>
          <PageWithEditor tabKey="patients" initialLayout={savedLayout} fallback={null} />
        </ModulesDataProvider>

        {/* Bandeau de stats — vue d'ensemble du cabinet */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label="Patients actifs"
            value={totalActifs}
            sub={totalInactifs > 0 ? `+ ${totalInactifs} inactif${totalInactifs > 1 ? "s" : ""}` : "Aucun inactif"}
          />
          <StatCard
            icon={<UserPlus className="h-5 w-5 text-emerald-600" />}
            label="Nouveaux ce mois-ci"
            value={nouveauxCeMois}
            sub={nouveauxCeMois > 0 ? "Arrivés depuis le 1er du mois" : "Aucune nouvelle arrivée"}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            label="Sans séance depuis 90 j"
            value={inactifsRelance}
            sub={inactifsRelance > 0 ? "Peut-être à relancer" : "Tous vus récemment"}
            tone={inactifsRelance > 0 ? "warning" : "default"}
          />
          <StatCard
            icon={<UserMinus className="h-5 w-5 text-muted-foreground" />}
            label="Total dans la base"
            value={totalActifs + totalInactifs}
            sub="Actifs + inactifs"
          />
        </div>

        {/* Barre de filtres + action */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PatientsFilters tags={tags} />
          <PatientForm
            mode="create"
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Ajouter un nouveau patient
              </Button>
            }
          />
        </div>

        <PatientsTable rows={patients} hasActiveFilters={hasActiveFilters} />
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
  tone?: "default" | "warning";
}) {
  const toneClass =
    tone === "warning" ? "border-amber-500/30 bg-amber-500/5" : "";
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
