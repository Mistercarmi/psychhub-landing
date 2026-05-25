"use server";

import { prisma } from "@/lib/db";

const MOIS_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sept",
  "Oct",
  "Nov",
  "Déc"
];

// ============================================================
//                          Types
// ============================================================

export interface DashboardSnapshot {
  from: string | null;
  to: string | null;
  patientsActifs: number;
  caPeriode: number;
  seancesHonoreesPeriode: number;
  facturesEnRetard: number;
}

export interface DashboardModulesData extends DashboardSnapshot {
  previous?: DashboardSnapshot;
  caMois: number;
  prochainesSeances: Array<{
    id: string;
    date: string;
    tarif: number;
    statut: string;
    patientPrenom: string;
    patientNom: string;
  }>;
}

export interface DashboardModulesDataOptions {
  from?: Date;
  to?: Date;
  compare?: "none" | "prev" | "yoy";
}

export type KpiCompareMode = "none" | "prev" | "yoy";
export type KpiSegment = "none" | "statut" | "duree";

export interface KpiSnapshot {
  from: string | null;
  to: string | null;
  caTotal: number;
  caPrevisionnel: number;
  tauxAnnulMoyen: number;
  tauxHonoration: number;
  caParMois: { mois: string; ca: number }[];
  top: { patient: string; ca: number }[];
  annulations: { mois: string; taux: number }[];
  caParMoisSegmente?: Array<{ mois: string } & Record<string, number>>;
  segments?: string[];
}

export interface KpiModulesData extends KpiSnapshot {
  previous?: KpiSnapshot;
}

export interface KpiModulesDataOptions {
  from?: Date;
  to?: Date;
  compare?: KpiCompareMode;
  segment?: KpiSegment;
}

export interface PatientsModulesData {
  totalActifs: number;
  totalInactifs: number;
  nouveauxMois: number;
  prochainsAnniversaires: Array<{ id: string; prenom: string; nom: string; dateNaissance: string }>;
}

export interface SeancesModulesData {
  totalMois: number;
  honorees: number;
  annulees: number;
  prochaines: Array<{
    id: string;
    date: string;
    tarif: number;
    statut: string;
    patientPrenom: string;
    patientNom: string;
  }>;
}

export interface FacturesModulesData {
  totalEmises: number;
  totalImpayees: number;
  totalEnRetard: number;
  montantImpaye: number;
  montantEnRetard: number;
  recentes: Array<{
    id: string;
    numero: string;
    dateEmission: string;
    montantTTC: number;
    statut: string;
    patientPrenom: string;
    patientNom: string;
  }>;
}

// ============================================================
//                         Helpers
// ============================================================

const HONORED = "HONOREE";
const CANCELLED = new Set(["ANNULEE_PATIENT", "ANNULEE_PRATICIEN", "ABSENCE"]);

function defaultMonthRange(): { from: Date; to: Date } {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setMilliseconds(-1);
  return { from: start, to: end };
}

function defaultYearToDate(): { from: Date; to: Date } {
  const now = new Date();
  return { from: new Date(now.getFullYear(), 0, 1), to: now };
}

function shiftRange(
  range: { from: Date; to: Date },
  mode: "prev" | "yoy"
): { from: Date; to: Date } {
  if (mode === "yoy") {
    const from = new Date(range.from);
    from.setFullYear(from.getFullYear() - 1);
    const to = new Date(range.to);
    to.setFullYear(to.getFullYear() - 1);
    return { from, to };
  }
  const lengthMs = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - lengthMs);
  return { from, to };
}

// ============================================================
//                       Dashboard
// ============================================================

async function loadDashboardSnapshot(from: Date, to: Date): Promise<DashboardSnapshot> {
  const [patientsActifs, agg, facturesEnRetard] = await Promise.all([
    prisma.patient.count({ where: { actif: true } }),
    prisma.seance.aggregate({
      _count: { id: true },
      _sum: { tarif: true },
      where: { date: { gte: from, lte: to }, statut: HONORED }
    }),
    prisma.facture.count({ where: { statut: "EN_RETARD" } })
  ]);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    patientsActifs,
    caPeriode: agg._sum.tarif ?? 0,
    seancesHonoreesPeriode: agg._count.id,
    facturesEnRetard
  };
}

export async function getDashboardModulesData(
  opts: DashboardModulesDataOptions = {}
): Promise<DashboardModulesData> {
  const range = opts.from && opts.to ? { from: opts.from, to: opts.to } : defaultMonthRange();

  const [current, prochaines] = await Promise.all([
    loadDashboardSnapshot(range.from, range.to),
    prisma.seance.findMany({
      where: { date: { gte: new Date() }, statut: "PLANIFIEE" },
      orderBy: { date: "asc" },
      take: 20,
      include: { patient: { select: { prenom: true, nom: true } } }
    })
  ]);

  let previous: DashboardSnapshot | undefined;
  if (opts.compare === "prev" || opts.compare === "yoy") {
    const prevRange = shiftRange(range, opts.compare);
    previous = await loadDashboardSnapshot(prevRange.from, prevRange.to);
  }

  return {
    ...current,
    caMois: current.caPeriode,
    previous,
    prochainesSeances: prochaines.map((s) => ({
      id: s.id,
      date: s.date.toISOString(),
      tarif: s.tarif,
      statut: s.statut,
      patientPrenom: s.patient.prenom,
      patientNom: s.patient.nom
    }))
  };
}

// ============================================================
//                         KPI
// ============================================================

async function loadKpiSnapshot(
  from: Date,
  to: Date,
  segment: KpiSegment
): Promise<KpiSnapshot> {
  const now = new Date();

  const [seances, previsionnel] = await Promise.all([
    prisma.seance.findMany({
      where: { date: { gte: from, lte: to } },
      select: {
        tarif: true,
        dureeMinutes: true,
        statut: true,
        date: true,
        patient: { select: { prenom: true, nom: true } }
      }
    }),
    prisma.seance.aggregate({
      _sum: { tarif: true },
      where: { date: { gte: now }, statut: "PLANIFIEE" }
    })
  ]);

  const monthKeys: string[] = [];
  const cursor = new Date(from);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= to) {
    monthKeys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  if (monthKeys.length === 0) {
    const k = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
    monthKeys.push(k);
  }
  const monthLabel = (key: string) => {
    const [, m] = key.split("-");
    return MOIS_LABELS[Number(m) - 1];
  };

  const caByMonth = new Map<string, number>();
  const seancesByMonth = new Map<string, { total: number; annul: number; honor: number }>();
  monthKeys.forEach((k) => {
    caByMonth.set(k, 0);
    seancesByMonth.set(k, { total: 0, annul: 0, honor: 0 });
  });

  let caTotal = 0;
  let totalSeances = 0;
  let totalAnnul = 0;
  let totalHonor = 0;

  const parPatient = new Map<string, number>();
  const segmentTotals = new Map<string, Map<string, number>>();

  function segmentOf(s: { statut: string; dureeMinutes: number }): string {
    if (segment === "statut") return s.statut;
    if (segment === "duree") {
      if (s.dureeMinutes < 30) return "<30 min";
      if (s.dureeMinutes < 50) return "30-49 min";
      if (s.dureeMinutes < 60) return "50-59 min";
      return "≥60 min";
    }
    return "all";
  }

  for (const s of seances) {
    const monthKey = `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = seancesByMonth.get(monthKey);
    if (!bucket) continue;
    bucket.total++;
    totalSeances++;
    if (s.statut === HONORED) {
      bucket.honor++;
      totalHonor++;
      const ca = s.tarif;
      caByMonth.set(monthKey, (caByMonth.get(monthKey) ?? 0) + ca);
      caTotal += ca;
      const key = `${s.patient.prenom} ${s.patient.nom}`;
      parPatient.set(key, (parPatient.get(key) ?? 0) + ca);

      if (segment !== "none") {
        const seg = segmentOf(s);
        let segMap = segmentTotals.get(seg);
        if (!segMap) {
          segMap = new Map();
          segmentTotals.set(seg, segMap);
        }
        segMap.set(monthKey, (segMap.get(monthKey) ?? 0) + ca);
      }
    } else if (CANCELLED.has(s.statut)) {
      bucket.annul++;
      totalAnnul++;
    }
  }

  const caParMois = monthKeys.map((k) => ({ mois: monthLabel(k), ca: caByMonth.get(k) ?? 0 }));
  const annulations = monthKeys.map((k) => {
    const b = seancesByMonth.get(k) ?? { total: 0, annul: 0, honor: 0 };
    return { mois: monthLabel(k), taux: b.total > 0 ? (b.annul / b.total) * 100 : 0 };
  });

  const sortedTop = [...parPatient.entries()].sort((a, b) => b[1] - a[1]);
  const top = sortedTop.slice(0, 5).map(([patient, ca]) => ({ patient, ca }));
  const reste = sortedTop.slice(5).reduce((acc, [, ca]) => acc + ca, 0);
  if (reste > 0) top.push({ patient: "Autres", ca: reste });

  const tauxAnnulMoyen = totalSeances > 0 ? (totalAnnul / totalSeances) * 100 : 0;
  const tauxHonoration = totalSeances > 0 ? (totalHonor / totalSeances) * 100 : 0;

  let caParMoisSegmente: KpiSnapshot["caParMoisSegmente"] | undefined;
  let segments: string[] | undefined;
  if (segment !== "none") {
    segments = [...segmentTotals.keys()].sort();
    caParMoisSegmente = monthKeys.map((k) => {
      const row = { mois: monthLabel(k) } as { mois: string } & Record<string, number>;
      for (const seg of segments!) {
        row[seg] = segmentTotals.get(seg)?.get(k) ?? 0;
      }
      return row;
    });
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    caTotal,
    caPrevisionnel: previsionnel._sum.tarif ?? 0,
    tauxAnnulMoyen,
    tauxHonoration,
    caParMois,
    top,
    annulations,
    caParMoisSegmente,
    segments
  };
}

export async function getKpiModulesData(
  opts: KpiModulesDataOptions = {}
): Promise<KpiModulesData> {
  const range = opts.from && opts.to ? { from: opts.from, to: opts.to } : defaultYearToDate();
  const segment = opts.segment ?? "none";
  const current = await loadKpiSnapshot(range.from, range.to, segment);

  let previous: KpiSnapshot | undefined;
  if (opts.compare === "prev" || opts.compare === "yoy") {
    const prev = shiftRange(range, opts.compare);
    previous = await loadKpiSnapshot(prev.from, prev.to, segment);
  }

  return { ...current, previous };
}

// ============================================================
//                       Patients
// ============================================================

export async function getPatientsModulesData(): Promise<PatientsModulesData> {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalActifs, totalInactifs, nouveauxMois, withDob] = await Promise.all([
    prisma.patient.count({ where: { actif: true } }),
    prisma.patient.count({ where: { actif: false } }),
    prisma.patient.count({ where: { createdAt: { gte: startMonth } } }),
    prisma.patient.findMany({
      where: { actif: true, dateNaissance: { not: null } },
      select: { id: true, prenom: true, nom: true, dateNaissance: true }
    })
  ]);

  const horizonDays = 60;
  const upcoming: Array<{
    id: string;
    prenom: string;
    nom: string;
    dateNaissance: string;
    nextBirthday: Date;
  }> = [];
  for (const p of withDob) {
    if (!p.dateNaissance) continue;
    const dob = new Date(p.dateNaissance);
    const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      next.setFullYear(now.getFullYear() + 1);
    }
    const diffDays = Math.floor((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= horizonDays) {
      upcoming.push({
        id: p.id,
        prenom: p.prenom,
        nom: p.nom,
        dateNaissance: p.dateNaissance.toISOString(),
        nextBirthday: next
      });
    }
  }
  upcoming.sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime());

  return {
    totalActifs,
    totalInactifs,
    nouveauxMois,
    prochainsAnniversaires: upcoming.slice(0, 10).map(({ nextBirthday: _n, ...rest }) => rest)
  };
}

// ============================================================
//                        Séances
// ============================================================

export async function getSeancesModulesData(): Promise<SeancesModulesData> {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [mois, prochaines] = await Promise.all([
    prisma.seance.findMany({
      where: { date: { gte: startMonth, lt: endMonth } },
      select: { statut: true }
    }),
    prisma.seance.findMany({
      where: { date: { gte: now } },
      orderBy: { date: "asc" },
      take: 10,
      include: { patient: { select: { prenom: true, nom: true } } }
    })
  ]);

  const totalMois = mois.length;
  const honorees = mois.filter((s) => s.statut === HONORED).length;
  const annulees = mois.filter((s) => CANCELLED.has(s.statut)).length;

  return {
    totalMois,
    honorees,
    annulees,
    prochaines: prochaines.map((s) => ({
      id: s.id,
      date: s.date.toISOString(),
      tarif: s.tarif,
      statut: s.statut,
      patientPrenom: s.patient.prenom,
      patientNom: s.patient.nom
    }))
  };
}

// ============================================================
//                       Factures
// ============================================================

export async function getFacturesModulesData(): Promise<FacturesModulesData> {
  const [emises, impayees, enRetard, recentes] = await Promise.all([
    prisma.facture.count({ where: { statut: "EMISE" } }),
    prisma.facture.findMany({
      where: { statut: { in: ["EMISE", "EN_RETARD"] } },
      select: { montantTTC: true }
    }),
    prisma.facture.findMany({
      where: { statut: "EN_RETARD" },
      select: { montantTTC: true }
    }),
    prisma.facture.findMany({
      orderBy: { dateEmission: "desc" },
      take: 10,
      include: { patient: { select: { prenom: true, nom: true } } }
    })
  ]);

  return {
    totalEmises: emises,
    totalImpayees: impayees.length,
    totalEnRetard: enRetard.length,
    montantImpaye: impayees.reduce((acc, f) => acc + f.montantTTC, 0),
    montantEnRetard: enRetard.reduce((acc, f) => acc + f.montantTTC, 0),
    recentes: recentes.map((f) => ({
      id: f.id,
      numero: f.numero,
      dateEmission: f.dateEmission.toISOString(),
      montantTTC: f.montantTTC,
      statut: f.statut,
      patientPrenom: f.patient.prenom,
      patientNom: f.patient.nom
    }))
  };
}
