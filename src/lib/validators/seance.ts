import { z } from "zod";
import { SEANCE_STATUTS } from "@/lib/utils";

export const seanceSchema = z.object({
  patientId: z.string().min(1, "Patient requis"),
  date: z.coerce.date(),
  dureeMinutes: z.coerce.number().int().positive().default(50),
  tarif: z.coerce.number().nonnegative(),
  statut: z.enum(SEANCE_STATUTS).default("PLANIFIEE"),
  notesSeance: z.string().optional()
});

export type SeanceInput = z.infer<typeof seanceSchema>;

export const doctolibRowSchema = z.object({
  doctolibRef: z.string().min(1),
  date: z.coerce.date(),
  patientNom: z.string().min(1),
  patientPrenom: z.string().min(1),
  patientEmail: z.string().email().nullable().optional(),
  dureeMinutes: z.coerce.number().int().positive(),
  statut: z.string().min(1)
});
export type DoctolibRow = z.infer<typeof doctolibRowSchema>;

export const doctolibBatchSchema = z.object({
  rows: z.array(doctolibRowSchema).max(5000, "Lot trop volumineux"),
  tarifDefaut: z.coerce.number().nonnegative()
});
