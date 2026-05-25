import { z } from "zod";

export const exportTableSchema = z.enum(["patients", "seances", "factures", "kpi"]);
export type ExportTable = z.infer<typeof exportTableSchema>;

export const exportFormatSchema = z.enum(["xlsx", "pdf", "docx", "gsheets", "json"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const exportDestinationSchema = z.enum(["download", "local_folder", "drive", "external_folder"]);
export type ExportDestination = z.infer<typeof exportDestinationSchema>;

export const exportFiltersSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  statusesSeance: z.array(z.string()).optional(),
  statusesFacture: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  patientIds: z.array(z.string()).optional()
});

export const exportScopeSchema = z.object({
  tables: z.array(exportTableSchema).min(1, "Au moins une table"),
  filters: exportFiltersSchema.default({}),
  columns: z.record(exportTableSchema, z.array(z.string())).optional(),
  format: exportFormatSchema,
  destination: exportDestinationSchema
});
export type ExportScope = z.infer<typeof exportScopeSchema>;

export const composeRequestSchema = z.object({
  scope: exportScopeSchema,
  templateName: z.string().min(1).optional(),
  templateDescription: z.string().optional()
});
export type ComposeRequest = z.infer<typeof composeRequestSchema>;

export const exportTemplateInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  format: exportFormatSchema,
  scope: exportScopeSchema
});
