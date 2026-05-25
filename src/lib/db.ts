import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  __psychhub_scheduler_booted?: boolean;
  __psychhub_integrity_booted?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Initialise le scheduler de sauvegardes automatiques au premier chargement du module
// côté serveur (Next.js conserve les modules entre requêtes).
if (typeof window === "undefined" && !globalForPrisma.__psychhub_scheduler_booted) {
  globalForPrisma.__psychhub_scheduler_booted = true;
  // Import paresseux pour éviter un cycle d'imports (scheduler → service → backup → db).
  void import("@/lib/backup/scheduler").then((m) => m.initScheduler()).catch(() => undefined);
}

// Vérification d'intégrité SQLite au démarrage du serveur (PRAGMA integrity_check).
// Best-effort, idempotent — un échec ne bloque pas l'app mais loggue un incident.
if (typeof window === "undefined" && !globalForPrisma.__psychhub_integrity_booted) {
  globalForPrisma.__psychhub_integrity_booted = true;
  void import("@/lib/backup/db-integrity")
    .then((m) => m.runStartupIntegrityCheck())
    .catch(() => undefined);
}
