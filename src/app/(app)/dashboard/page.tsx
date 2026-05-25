import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageWithEditor } from "@/components/editor/page-with-editor";
import { ModulesDataProvider } from "@/editor/context/modules-data-context";
import { getDashboardModulesData } from "@/server/modules-data.actions";
import { getLayout } from "@/server/layouts.actions";
import { formatEuros } from "@/lib/utils";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { rangeFromSearchParams } from "@/lib/date-range";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function LegacyDashboard({
  patients,
  caMois,
  facturesEnRetard,
  prochainesSeances
}: {
  patients: number;
  caMois: number;
  facturesEnRetard: number;
  prochainesSeances: Array<{
    id: string;
    date: string;
    tarif: number;
    patientPrenom: string;
    patientNom: string;
  }>;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Patients actifs</CardDescription>
            <CardTitle className="text-3xl">{patients}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CA période</CardDescription>
            <CardTitle className="text-3xl">{formatEuros(caMois)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Factures en retard</CardDescription>
            <CardTitle className="text-3xl">{facturesEnRetard}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Statut</CardDescription>
            <CardTitle className="text-base">
              <Badge variant="secondary">Local · sécurisé</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prochaines séances</CardTitle>
          <CardDescription>Les 5 prochains rendez-vous planifiés</CardDescription>
        </CardHeader>
        <CardContent>
          {prochainesSeances.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune séance planifiée.
            </p>
          ) : (
            <ul className="divide-y">
              {prochainesSeances.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">
                      {s.patientPrenom} {s.patientNom}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.date).toLocaleString("fr-FR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>
                  <Badge variant="outline">{formatEuros(s.tarif)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: { from?: string; to?: string; preset?: string; compare?: string };
}) {
  const { range } = rangeFromSearchParams({
    from: searchParams.from,
    to: searchParams.to,
    preset: searchParams.preset
  });
  const compare =
    searchParams.compare === "prev" || searchParams.compare === "yoy"
      ? (searchParams.compare as "prev" | "yoy")
      : "none";

  const [data, savedLayout, config] = await Promise.all([
    getDashboardModulesData({
      from: range?.from,
      to: range?.to,
      compare
    }),
    getLayout("dashboard"),
    prisma.config.findUnique({ where: { id: "default" } })
  ]);

  // Future-proof : si l'utilisateur a un champ `dashboardAutoRefreshMin` futur dans Config, on l'utilise.
  // Pour l'instant on prend 0 par défaut (off). La valeur sera exposée dans Paramètres en Sprint 6.
  const autoRefreshMinutes =
    typeof (config as unknown as { dashboardAutoRefreshMin?: number })?.dashboardAutoRefreshMin === "number"
      ? (config as unknown as { dashboardAutoRefreshMin: number }).dashboardAutoRefreshMin
      : 0;

  return (
    <>
      <Topbar title="Dashboard" showEditorToggle />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <DashboardToolbar autoRefreshMinutes={autoRefreshMinutes} />
        <ModulesDataProvider data={{ dashboard: data }}>
          <PageWithEditor
            tabKey="dashboard"
            initialLayout={savedLayout}
            fallback={
              <LegacyDashboard
                patients={data.patientsActifs}
                caMois={data.caMois}
                facturesEnRetard={data.facturesEnRetard}
                prochainesSeances={data.prochainesSeances}
              />
            }
          />
        </ModulesDataProvider>
      </div>
    </>
  );
}
