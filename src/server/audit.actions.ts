"use server";

import { prisma } from "@/lib/db";

export type AuditLogFilter = {
  entityType?: string;
  action?: string;
  from?: Date | string;
  to?: Date | string;
  page?: number;
  pageSize?: number;
  /** Compat ascendante : équivaut à pageSize quand pageSize n'est pas fourni. */
  limit?: number;
};

export type AuditLogRow = {
  id: string;
  entityType: string;
  entityId: string | null;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: string;
};

export type AuditLogPage = {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function parseJson(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Renvoie la trace d'audit complète pour une entité (Patient, Seance, Facture, etc.).
 * Tri descendant (plus récent en premier), limite par défaut 200.
 */
export async function getEntityAuditTrail(
  entityType: string,
  entityId: string,
  limit = 200
): Promise<AuditLogRow[]> {
  const raw = await prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: limit
  });
  return raw.map((r) => ({
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    action: r.action,
    before: parseJson(r.before),
    after: parseJson(r.after),
    createdAt: r.createdAt.toISOString()
  }));
}

export async function listAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogPage> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(200, Math.max(10, filter.pageSize ?? filter.limit ?? 50));

  const where: Record<string, unknown> = {};
  if (filter.entityType && filter.entityType !== "ALL") {
    where.entityType = filter.entityType;
  }
  if (filter.action && filter.action !== "ALL") {
    where.action = filter.action;
  }
  if (filter.from || filter.to) {
    const range: { gte?: Date; lte?: Date } = {};
    if (filter.from) range.gte = new Date(filter.from);
    if (filter.to) range.lte = new Date(filter.to);
    where.createdAt = range;
  }

  const [total, raw] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return {
    rows: raw.map((r) => ({
      id: r.id,
      entityType: r.entityType,
      entityId: r.entityId,
      action: r.action,
      before: parseJson(r.before),
      after: parseJson(r.after),
      createdAt: r.createdAt.toISOString()
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}
