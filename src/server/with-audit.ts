import "server-only";
import { audit, type AuditAction } from "@/lib/audit";

type AuditEntity = "Patient" | "Seance" | "Facture" | "Config" | "Layout" | "Tag" | "SeanceTemplate";

type WithAuditOptions<T> = {
  entityType: AuditEntity;
  action: AuditAction;
  /** Capture l'état "avant" en lecture seule. Utile pour UPDATE / DELETE. */
  loadBefore?: () => Promise<unknown | null>;
  /** Déduit l'id à partir du résultat de fn (ex: r => r.id). */
  entityId?: ((after: T) => string | null | undefined) | string;
  /** Le travail métier à exécuter. Doit renvoyer l'entité résultante (ou null pour DELETE). */
  fn: () => Promise<T>;
};

/**
 * Enveloppe une mutation Prisma et journalise dans AuditLog.
 * - Capture before/after en JSON.
 * - Ne fait jamais échouer la mutation si l'audit lui-même échoue (cf. src/lib/audit.ts).
 */
export async function withAudit<T>(opts: WithAuditOptions<T>): Promise<T> {
  const before = opts.loadBefore ? await safe(opts.loadBefore) : undefined;
  const after = await opts.fn();
  const entityId =
    typeof opts.entityId === "function"
      ? opts.entityId(after) ?? null
      : (opts.entityId ?? (after as { id?: string } | null)?.id ?? null);

  await audit({
    entityType: opts.entityType,
    entityId: entityId ?? null,
    action: opts.action,
    before,
    after: opts.action === "DELETE" ? null : after
  });

  return after;
}

async function safe<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}
