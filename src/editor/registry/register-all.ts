import { registerModule } from "./module-registry";

// KPI
import { kpiPatientsActifsModule } from "../modules/kpi/kpi-patients-actifs.module";
import { kpiCaMoisModule } from "../modules/kpi/kpi-ca-mois.module";
import { kpiFacturesRetardModule } from "../modules/kpi/kpi-factures-retard.module";
import { kpiStatutAppModule } from "../modules/kpi/kpi-statut-app.module";
import { kpiCaCumuleModule } from "../modules/kpi/kpi-ca-cumule.module";
import { kpiCaPrevisionnelModule } from "../modules/kpi/kpi-ca-previsionnel.module";
import { kpiTauxAnnulationModule } from "../modules/kpi/kpi-taux-annulation.module";
import { kpiNouveauxPatientsMoisModule } from "../modules/kpi/kpi-nouveaux-patients-mois.module";
import { kpiPatientsInactifsModule } from "../modules/kpi/kpi-patients-inactifs.module";
import { kpiSeancesMoisModule } from "../modules/kpi/kpi-seances-mois.module";
import { kpiFacturesImpayeesModule } from "../modules/kpi/kpi-factures-impayees.module";
import { kpiComparaisonPeriodeModule } from "../modules/kpi/kpi-comparaison-periode.module";
import { kpiTxHonorationModule } from "../modules/kpi/kpi-tx-honoration.module";

// Charts
import { chartCaMoisModule } from "../modules/charts/chart-ca-mois.module";
import { chartRepartitionPatientsModule } from "../modules/charts/chart-repartition-patients.module";
import { chartAnnulationsModule } from "../modules/charts/chart-annulations.module";
import { chartCaMensuelSegmenteModule } from "../modules/charts/chart-ca-mensuel-segmente.module";

// Listes
import { listeProchainesSeancesModule } from "../modules/listes/liste-prochaines-seances.module";
import { listeAnniversairesModule } from "../modules/listes/liste-anniversaires.module";
import { listeFacturesRecentesModule } from "../modules/listes/liste-factures-recentes.module";
import { listeSeancesProchainesDetailModule } from "../modules/listes/liste-seances-prochaines-detail.module";
import { calendrierSemaineModule } from "../modules/listes/calendrier-semaine.module";

// Utils
import { noteLibreModule } from "../modules/utils/note-libre.module";
import { headingModule } from "../modules/utils/heading.module";
import { dividerModule } from "../modules/utils/divider.module";
import { raccourciActionModule } from "../modules/utils/raccourci-action.module";
import { miniCalendrierModule } from "../modules/utils/mini-calendrier.module";

let bootstrapped = false;

export function bootstrapModuleRegistry(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  // KPI
  registerModule(kpiPatientsActifsModule);
  registerModule(kpiCaMoisModule);
  registerModule(kpiFacturesRetardModule);
  registerModule(kpiStatutAppModule);
  registerModule(kpiCaCumuleModule);
  registerModule(kpiCaPrevisionnelModule);
  registerModule(kpiTauxAnnulationModule);
  registerModule(kpiNouveauxPatientsMoisModule);
  registerModule(kpiPatientsInactifsModule);
  registerModule(kpiSeancesMoisModule);
  registerModule(kpiFacturesImpayeesModule);
  registerModule(kpiComparaisonPeriodeModule);
  registerModule(kpiTxHonorationModule);

  // Charts
  registerModule(chartCaMoisModule);
  registerModule(chartRepartitionPatientsModule);
  registerModule(chartAnnulationsModule);
  registerModule(chartCaMensuelSegmenteModule);

  // Listes
  registerModule(listeProchainesSeancesModule);
  registerModule(listeAnniversairesModule);
  registerModule(listeFacturesRecentesModule);
  registerModule(listeSeancesProchainesDetailModule);
  registerModule(calendrierSemaineModule);

  // Utils
  registerModule(noteLibreModule);
  registerModule(headingModule);
  registerModule(dividerModule);
  registerModule(raccourciActionModule);
  registerModule(miniCalendrierModule);
}

bootstrapModuleRegistry();
