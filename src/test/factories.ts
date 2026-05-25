/**
 * Factories de données de test (sans toucher la base).
 * Utilisé par les tests unitaires pour générer rapidement des objets cohérents.
 */
import type { SeanceStatut } from "@/lib/utils";

let counter = 0;
const nextId = () => `test-${++counter}`;

export interface FakePatient {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function makePatient(overrides: Partial<FakePatient> = {}): FakePatient {
  return {
    id: nextId(),
    nom: "Durand",
    prenom: "Marie",
    email: "marie.durand@example.com",
    telephone: null,
    actif: true,
    createdAt: new Date("2025-01-01T10:00:00Z"),
    updatedAt: new Date("2025-01-01T10:00:00Z"),
    ...overrides
  };
}

export interface FakeSeance {
  id: string;
  patientId: string;
  date: Date;
  dureeMinutes: number;
  tarif: number;
  statut: SeanceStatut;
  notesSeance: string | null;
  factureId: string | null;
}

export function makeSeance(overrides: Partial<FakeSeance> = {}): FakeSeance {
  return {
    id: nextId(),
    patientId: "patient-1",
    date: new Date("2025-06-15T14:00:00Z"),
    dureeMinutes: 50,
    tarif: 60,
    statut: "PLANIFIEE",
    notesSeance: null,
    factureId: null,
    ...overrides
  };
}

export interface FakeFacture {
  id: string;
  numero: string;
  patientId: string;
  dateEmission: Date;
  montantHT: number;
  montantTTC: number;
  tva: number;
  statut: "BROUILLON" | "EMISE" | "PAYEE" | "EN_RETARD" | "ANNULEE";
}

export function makeFacture(overrides: Partial<FakeFacture> = {}): FakeFacture {
  return {
    id: nextId(),
    numero: "F-2025-0001",
    patientId: "patient-1",
    dateEmission: new Date("2025-06-30T09:00:00Z"),
    montantHT: 180,
    montantTTC: 180,
    tva: 0,
    statut: "EMISE",
    ...overrides
  };
}

export function resetIdCounter() {
  counter = 0;
}
