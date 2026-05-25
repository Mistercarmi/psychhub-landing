import { prisma } from "@/lib/db";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "READ_SENSITIVE";

export async function audit(input: {
  entityType: string;
  entityId?: string | null;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        action: input.action,
        before: input.before !== undefined ? safeJson(input.before) : null,
        after: input.after !== undefined ? safeJson(input.after) : null,
        userId: null
      }
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[audit] échec d'écriture:", e);
    }
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => {
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "bigint") return v.toString();
      return v;
    });
  } catch {
    return "[Unserialisable]";
  }
}
