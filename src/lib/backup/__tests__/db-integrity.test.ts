import { describe, it, expect, vi, beforeEach } from "vitest";

// On mock @/lib/db pour contrôler la réponse de $queryRawUnsafe sans toucher
// à une vraie SQLite (le test reste pur et rapide).
vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn()
  }
}));

import { prisma } from "@/lib/db";
import { checkDatabaseIntegrity } from "@/lib/backup/db-integrity";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkDatabaseIntegrity", () => {
  it("returns ok when SQLite answers 'ok'", async () => {
    (prisma.$queryRawUnsafe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { integrity_check: "ok" }
    ]);
    const r = await checkDatabaseIntegrity();
    expect(r.status).toBe("ok");
    expect(r.details).toEqual(["ok"]);
    expect(typeof r.durationMs).toBe("number");
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns corrupt when SQLite reports issues", async () => {
    (prisma.$queryRawUnsafe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { integrity_check: "*** in database main ***" },
      { integrity_check: "Page 42: btree corrupted" }
    ]);
    const r = await checkDatabaseIntegrity();
    expect(r.status).toBe("corrupt");
    expect(r.details).toHaveLength(2);
  });

  it("returns error when the query throws", async () => {
    (prisma.$queryRawUnsafe as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("database is locked")
    );
    const r = await checkDatabaseIntegrity();
    expect(r.status).toBe("error");
    expect(r.details[0]).toContain("database is locked");
  });

  it("treats 'ok' alongside other lines as corrupt (defensive)", async () => {
    // 'ok' DOIT être unique. Sinon on ne fait pas confiance.
    (prisma.$queryRawUnsafe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { integrity_check: "ok" },
      { integrity_check: "Page 1: warning" }
    ]);
    const r = await checkDatabaseIntegrity();
    expect(r.status).toBe("corrupt");
  });
});
