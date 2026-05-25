import { z } from "zod";
import { ibanSchema, phoneSchema, siretSchema } from "./common";

export const configSchema = z.object({
  cabinetNom: z.string().optional(),
  praticienNom: z.string().optional(),
  adresse: z.string().optional(),
  telephone: phoneSchema.optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  siret: siretSchema.optional().or(z.literal("")),
  adeli: z.string().optional(),
  iban: ibanSchema.optional().or(z.literal("")),
  tarifDefaut: z.coerce.number().nonnegative().default(60),
  dureeDefaut: z.coerce.number().int().positive().default(50),
  tvaDefaut: z.coerce.number().nonnegative().default(0),
  prefixeFacture: z.string().default("F"),
  templateMailRelance: z.string().optional(),
  templateMailConfirmation: z.string().optional(),
  templateMailRappelSeance: z.string().optional(),
  rappelsActifs: z.coerce.boolean().default(false),
  rappelsHeuresAvant: z.coerce.number().int().min(1).max(168).default(24)
});

export type ConfigInput = z.infer<typeof configSchema>;
