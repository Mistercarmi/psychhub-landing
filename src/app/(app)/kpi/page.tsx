import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CaParMoisChart,
  RepartitionPatientsChart,
  AnnulationsChart
} from "@/components/kpi/charts";
import { PageWithEditor } from "@/components/editor/page-with-editor";
import { ModulesDataProvider } from "@/editor/context/modules-data-context";
import {
  getKpiModulesData,
  type KpiCompareMode,
  type KpiSegment
} from "@/server/modules-data.actions";
import { getLayout } from "@/server/layouts.actions";
import { formatEuros } from "@/lib/utils";
import { KpiToolbar } from "@/components/kpi/kpi-toolbar";
import { rangeFromSearchParams } from "@/lib/date-range";

export const dynamic = "force-dynamic";

function LegacyKpi({
  caTotal,
  caPrevisionnel,
  tauxAnnulMoyen,
  tauxHonoration,
  caParMois,
  top,
  annulations
}: {
  caTotal: number;
  caPrevisionnel: number;
  tauxAnnulMoyen: number;
  tauxHonoration: number;
  caParMois: { mois: string; ca: number }[];
  top: { patient: string; ca: number }[];
  annulations: { mois: string; taux: number }[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CA période</CardDescription>
            <CardTitle className="text-3xl">{formatEuros(caTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CA prévisionnel</CardDescription>
            <CardTitle className="text-3xl">{formatEuros(caPrevisionnel)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taux d&apos;honoration</CardDescription>
            <CardTitle className="text-3xl">{tauxHonoration.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taux d&apos;annulation moyen</CardDescription>
            <CardTitle className="text-3xl">{tauxAnnulMoyen.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chiffre d&apos;affaires par mois</CardTitle>
            <CardDescription>Séances honorées uniquement</CardDescription>
          </CardHeader>
          <CardContent>
            <CaParMoisChart data={caParMois} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par patient</CardTitle>
            <CardDescription>Top 5 + autres</CardDescription>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Pas encore de données.
              </p>
            ) : (
              <RepartitionPatientsChart data={top} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Taux d&apos;annulation par mois</CardTitle>
            <CardDescription>
              Inclut annulations patient/praticien et absences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnnulationsChart data={annulations} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function KpiPage({
  searchParams
}: {
  searchParams: {
    from?: string;
    to?: string;
    preset?: string;
    compare?: string;
    segment?: string;
  };
}) {
  const { range } = rangeFromSearchParams({
    from: searchParams.from,
    to: searchParams.to,
    preset: searchParams.preset
  });
  const compare: KpiCompareMode =
    searchParams.compare === "prev" || searchParams.compare === "yoy"
      ? (searchParams.compare as KpiCompareMode)
      : "none";
  const segment: KpiSegment =
    searchParams.segment === "statut" || searchParams.segment === "duree"
      ? (searchParams.segment as KpiSegment)
      : "none";

  const [data, savedLayout] = await Promise.all([
    getKpiModulesData({ from: range?.from, to: range?.to, compare, segment }),
    getLayout("kpi")
  ]);

  return (
    <>
      <Topbar title="KPI" showEditorToggle />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <KpiToolbar />
        <ModulesDataProvider data={{ kpi: data }}>
          <PageWithEditor
            tabKey="kpi"
            initialLayout={savedLayout}
            fallback={
              <LegacyKpi
                caTotal={data.caTotal}
                caPrevisionnel={data.caPrevisionnel}
                tauxAnnulMoyen={data.tauxAnnulMoyen}
                tauxHonoration={data.tauxHonoration}
                caParMois={data.caParMois}
                top={data.top}
                annulations={data.annulations}
              />
            }
          />
        </ModulesDataProvider>
      </div>
    </>
  );
}
