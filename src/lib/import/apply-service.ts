/**
 * Service applicatif d'import unifié.
 * Reçoit un ensemble de feuilles + mapping + résolutions de conflits dédoublonnage,
 * applique en transaction, et journalise dans `ImportLog`.
 */

import { prisma } from "@/lib/db";
import type { EntityType } from "./detect-type";
import { applyMapping } from "./column-mapper";
import { withAudit } from "@/server/with-audit";

export type ConflictResolution =
  | { action: "create" }
  | { action: "merge"; patientId: string }
  | { action: "skip" };

export type ApplySheet = {
  name: string;
  detectedType: EntityType;
  targetEntity?: "patients" | "seances" | "factures";
  mapping: Record<string, string>;
  rows: Record<string, unknown>[];
  /** Résolutions de conflits par index de ligne (uniquement pour les patients). */
  resolutions?: Record<number, ConflictResolution>;
};

export type ApplyResult = {
  patientsCreated: number;
  patientsUpdated: number;
  seancesCreated: number;
  seancesUpdated: number;
  facturesCreated: number;
  facturesUpdated: number;
  conflictsResolved: number;
  rowsSkipped: number;
  errors: string[];
};

function coerceDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;
  // Format FR jj/mm/aaaa [hh:mm]
  const fr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (fr) {
    return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]), Number(fr[4] ?? 0), Number(fr[5] ?? 0));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const v = String(value ?? "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "oui" || v === "yes";
}

function cleanString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

async function applyPatients(
  sheet: ApplySheet,
  result: ApplyResult
): Promise<{ idxToPatientId: Map<number, string> }> {
  const mapped = applyMapping(sheet.rows, sheet.mapping);
  const idxToPatientId = new Map<number, string>();

  for (let i = 0; i < mapped.length; i++) {
    const r = mapped[i];
    const resolution = sheet.resolutions?.[i];

    if (resolution?.action === "skip") {
      result.rowsSkipped++;
      continue;
    }

    const data = {
      nom: cleanString(r.nom),
      prenom: cleanString(r.prenom),
      dateNaissance: coerceDate(r.dateNaissance),
      email: cleanString(r.email),
      telephone: cleanString(r.telephone),
      adresse: cleanString(r.adresse),
      numeroSecu: cleanString(r.numeroSecu),
      motifConsult: cleanString(r.motifConsult),
      notesCliniques: cleanString(r.notesCliniques),
      actif: r.actif === undefined ? true : coerceBoolean(r.actif)
    };

    if (!data.nom || !data.prenom) {
      result.rowsSkipped++;
      continue;
    }

    if (resolution?.action === "merge") {
      const updated = await withAudit({
        entityType: "Patient",
        action: "UPDATE",
        entityId: resolution.patientId,
        loadBefore: () => prisma.patient.findUnique({ where: { id: resolution.patientId } }),
        fn: () =>
          prisma.patient.update({
            where: { id: resolution.patientId },
            data: {
              dateNaissance: data.dateNaissance ?? undefined,
              email: data.email ?? undefined,
              telephone: data.telephone ?? undefined,
              adresse: data.adresse ?? undefined,
              numeroSecu: data.numeroSecu ?? undefined,
              motifConsult: data.motifConsult ?? undefined,
              notesCliniques: data.notesCliniques ?? undefined
            }
          })
      });
      idxToPatientId.set(i, updated.id);
      result.patientsUpdated++;
      result.conflictsResolved++;
      continue;
    }

    // Création (par défaut ou résolution "create")
    const created = await withAudit({
      entityType: "Patient",
      action: "CREATE",
      fn: () =>
        prisma.patient.create({
          data: data as never
        })
    });
    idxToPatientId.set(i, created.id);
    result.patientsCreated++;
    if (resolution?.action === "create") result.conflictsResolved++;
  }
  return { idxToPatientId };
}

async function applySeances(sheet: ApplySheet, result: ApplyResult) {
  const mapped = applyMapping(sheet.rows, sheet.mapping);
  const config = await prisma.config.findUnique({ where: { id: "default" } });
  const tarifDefaut = config?.tarifDefaut ?? 60;

  for (const r of mapped) {
    const date = coerceDate(r.date);
    const dureeMinutes = coerceNumber(r.dureeMinutes) ?? 50;
    const tarif = coerceNumber(r.tarif) ?? tarifDefaut;
    const statut = cleanString(r.statut) ?? "PLANIFIEE";
    const doctolibRef = cleanString(r.doctolibRef);
    const notes = cleanString(r.notesSeance);

    if (!date) {
      result.rowsSkipped++;
      continue;
    }

    // Réconciliation patient
    let patientId = cleanString(r.patientId);
    if (!patientId) {
      const nom = cleanString(r.patientNom);
      const prenom = cleanString(r.patientPrenom);
      const email = cleanString(r.patientEmail);
      if (!nom && !prenom && !email) {
        result.rowsSkipped++;
        continue;
      }
      const found = email
        ? await prisma.patient.findFirst({ where: { email } })
        : await prisma.patient.findFirst({ where: { nom: nom ?? "", prenom: prenom ?? "" } });
      if (found) {
        patientId = found.id;
      } else if (nom && prenom) {
        const created = await withAudit({
          entityType: "Patient",
          action: "CREATE",
          fn: () => prisma.patient.create({ data: { nom, prenom, email } as never })
        });
        patientId = created.id;
        result.patientsCreated++;
      } else {
        result.rowsSkipped++;
        continue;
      }
    }

    const existing = doctolibRef
      ? await prisma.seance.findUnique({ where: { doctolibRef } })
      : null;

    if (existing) {
      await withAudit({
        entityType: "Seance",
        action: "UPDATE",
        entityId: existing.id,
        loadBefore: async () => existing,
        fn: () =>
          prisma.seance.update({
            where: { id: existing.id },
            data: {
              date,
              dureeMinutes,
              tarif,
              statut,
              patientId: patientId!,
              notesSeance: notes ?? undefined
            }
          })
      });
      result.seancesUpdated++;
    } else {
      await withAudit({
        entityType: "Seance",
        action: "CREATE",
        fn: () =>
          prisma.seance.create({
            data: {
              date,
              dureeMinutes,
              tarif,
              statut,
              patientId: patientId!,
              sourceImport: sheet.detectedType === "doctolib" ? "doctolib" : "import",
              doctolibRef: doctolibRef ?? null,
              notesSeance: notes ?? null
            }
          })
      });
      result.seancesCreated++;
    }
  }
}

async function applyFactures(sheet: ApplySheet, result: ApplyResult) {
  const mapped = applyMapping(sheet.rows, sheet.mapping);

  for (const r of mapped) {
    const numero = cleanString(r.numero);
    const dateEmission = coerceDate(r.dateEmission) ?? new Date();
    const montantTTC = coerceNumber(r.montantTTC);
    if (!numero || montantTTC === null) {
      result.rowsSkipped++;
      continue;
    }

    let patientId = cleanString(r.patientId);
    if (!patientId) {
      const nom = cleanString(r.patientNom);
      const prenom = cleanString(r.patientPrenom);
      if (nom && prenom) {
        const found = await prisma.patient.findFirst({ where: { nom, prenom } });
        patientId = found?.id ?? null;
      }
    }
    if (!patientId) {
      result.rowsSkipped++;
      continue;
    }

    const data = {
      numero,
      patientId,
      dateEmission,
      dateEcheance: coerceDate(r.dateEcheance),
      montantHT: coerceNumber(r.montantHT) ?? montantTTC,
      montantTTC,
      tva: coerceNumber(r.tva) ?? 0,
      statut: cleanString(r.statut) ?? "EMISE",
      datePaiement: coerceDate(r.datePaiement),
      modePaiement: cleanString(r.modePaiement),
      notes: cleanString(r.notes)
    };

    const existing = await prisma.facture.findUnique({ where: { numero } });
    if (existing) {
      await withAudit({
        entityType: "Facture",
        action: "UPDATE",
        entityId: existing.id,
        loadBefore: async () => existing,
        fn: () => prisma.facture.update({ where: { id: existing.id }, data: data as never })
      });
      result.facturesUpdated++;
    } else {
      await withAudit({
        entityType: "Facture",
        action: "CREATE",
        fn: () => prisma.facture.create({ data: data as never })
      });
      result.facturesCreated++;
    }
  }
}

export async function applyImport(sheets: ApplySheet[]): Promise<ApplyResult> {
  const result: ApplyResult = {
    patientsCreated: 0,
    patientsUpdated: 0,
    seancesCreated: 0,
    seancesUpdated: 0,
    facturesCreated: 0,
    facturesUpdated: 0,
    conflictsResolved: 0,
    rowsSkipped: 0,
    errors: []
  };

  for (const sheet of sheets) {
    const target =
      sheet.targetEntity ??
      (sheet.detectedType === "doctolib"
        ? "seances"
        : sheet.detectedType === "patients"
          ? "patients"
          : sheet.detectedType === "seances"
            ? "seances"
            : sheet.detectedType === "factures"
              ? "factures"
              : null);
    if (!target) continue;
    try {
      if (target === "patients") await applyPatients(sheet, result);
      else if (target === "seances") await applySeances(sheet, result);
      else if (target === "factures") await applyFactures(sheet, result);
    } catch (err) {
      result.errors.push(
        `Feuille "${sheet.name}" (${target}) : ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return result;
}
