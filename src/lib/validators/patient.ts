import { z } from "zod";
import { numeroSecuSchema, phoneSchema } from "./common";

export const patientSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().min(1, "Prénom requis"),
  dateNaissance: z.coerce.date().optional().nullable(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  telephone: phoneSchema.optional().or(z.literal("")),
  adresse: z.string().optional(),
  numeroSecu: numeroSecuSchema.optional().or(z.literal("")),
  motifConsult: z.string().optional(),
  notesCliniques: z.string().optional(),
  actif: z.boolean().default(true)
});

export type PatientInput = z.infer<typeof patientSchema>;
