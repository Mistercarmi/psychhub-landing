import {
  CURRENT_LAYOUT_SCHEMA_VERSION,
  DEFAULT_GRID_CONFIG,
  type LayoutDefinition,
  type ModuleConfig,
  type TabKey
} from "../types";

function defaultModules(tab: TabKey): ModuleConfig[] {
  switch (tab) {
    case "dashboard":
      return [
        {
          id: "default-kpi-patients",
          type: "kpi-patients-actifs",
          gridPosition: { x: 0, y: 0, w: 3, h: 2 },
          props: {},
          visible: true
        },
        {
          id: "default-kpi-ca-mois",
          type: "kpi-ca-mois",
          gridPosition: { x: 3, y: 0, w: 3, h: 2 },
          props: {},
          visible: true
        },
        {
          id: "default-kpi-factures-retard",
          type: "kpi-factures-retard",
          gridPosition: { x: 6, y: 0, w: 3, h: 2 },
          props: {},
          visible: true
        },
        {
          id: "default-kpi-statut",
          type: "kpi-statut-app",
          gridPosition: { x: 9, y: 0, w: 3, h: 2 },
          props: {},
          visible: true
        },
        {
          id: "default-liste-prochaines",
          type: "liste-prochaines-seances",
          gridPosition: { x: 0, y: 2, w: 12, h: 5 },
          props: { limit: 5 },
          visible: true
        }
      ];

    case "kpi":
      return [
        {
          id: "default-kpi-ca-cumule",
          type: "kpi-ca-cumule",
          gridPosition: { x: 0, y: 0, w: 4, h: 2 },
          props: {},
          visible: true
        },
        {
          id: "default-kpi-ca-previsionnel",
          type: "kpi-ca-previsionnel",
          gridPosition: { x: 4, y: 0, w: 4, h: 2 },
          props: {},
          visible: true
        },
        {
          id: "default-kpi-taux-annulation",
          type: "kpi-taux-annulation",
          gridPosition: { x: 8, y: 0, w: 4, h: 2 },
          props: {},
          visible: true
        },
        {
          id: "default-chart-ca-mois",
          type: "chart-ca-mois",
          gridPosition: { x: 0, y: 2, w: 6, h: 5 },
          props: {},
          visible: true
        },
        {
          id: "default-chart-repartition",
          type: "chart-repartition-patients",
          gridPosition: { x: 6, y: 2, w: 6, h: 5 },
          props: {},
          visible: true
        },
        {
          id: "default-chart-annulations",
          type: "chart-annulations",
          gridPosition: { x: 0, y: 7, w: 12, h: 5 },
          props: {},
          visible: true
        }
      ];

    // Pages CRUD : zone modulaire vide par défaut pour ne PAS décaler la table.
    // L'utilisateur ajoute manuellement les modules dont il a besoin.
    case "patients":
    case "seances":
    case "factures":
    case "parametres":
      return [];

    default:
      return [];
  }
}

export function getDefaultLayout(tab: TabKey): LayoutDefinition {
  return {
    id: `default-${tab}`,
    tabKey: tab,
    name: "Default",
    isDefault: true,
    modules: defaultModules(tab),
    gridConfig: DEFAULT_GRID_CONFIG,
    schemaVersion: CURRENT_LAYOUT_SCHEMA_VERSION
  };
}
