import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    facture: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    config: {
      findUnique: vi.fn()
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({})
    }
  }
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

// Court-circuite withAudit : exécute la fonction métier sans dépendre de `server-only`.
vi.mock("@/server/with-audit", () => ({
  withAudit: async <T,>(opts: { fn: () => Promise<T> }) => opts.fn()
}));

import { prisma } from "@/lib/db";
import { marquerRelanceEnvoyeeUI, getRelancesHistory } from "@/server/relances.actions";

type Mocked = ReturnType<typeof vi.fn>;

const factureFindUnique = prisma.facture.findUnique as unknown as Mocked;
const factureUpdate = prisma.facture.update as unknown as Mocked;
const configFindUnique = prisma.config.findUnique as unknown as Mocked;

const VALID_CUID = "cjld2cjxh0000qzrmn831i7rn";

function buildFacture(overrides: {
  dateEcheance?: Date | null;
  dateEmission?: Date;
  relancesEnvoyeesJson?: string | null;
} = {}) {
  return {
    id: VALID_CUID,
    dateEmission: overrides.dateEmission ?? new Date(),
    dateEcheance: overrides.dateEcheance ?? null,
    relancesEnvoyeesJson: overrides.relancesEnvoyeesJson ?? null
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  factureUpdate.mockResolvedValue({});
});

describe("marquerRelanceEnvoyeeUI", () => {
  it("rejette un id invalide", async () => {
    await expect(marquerRelanceEnvoyeeUI("not-a-cuid")).rejects.toThrow(
      /identifiant/i
    );
  });

  it("throw si facture introuvable", async () => {
    factureFindUnique.mockResolvedValue(null);
    configFindUnique.mockResolvedValue(null);
    await expect(marquerRelanceEnvoyeeUI(VALID_CUID)).rejects.toThrow(/introuvable/i);
  });

  it("retourne [] quand aucun palier n'est encore atteint", async () => {
    const dateEcheance = new Date(Date.now() - 5 * 86_400_000); // -5 jours
    factureFindUnique.mockResolvedValue(buildFacture({ dateEcheance }));
    configFindUnique.mockResolvedValue({ delaisRelancesJson: JSON.stringify([15, 30]) });

    const result = await marquerRelanceEnvoyeeUI(VALID_CUID);
    expect(result).toEqual([]);
    expect(factureUpdate).not.toHaveBeenCalled();
  });

  it("marque les paliers atteints et persiste l'historique", async () => {
    const dateEcheance = new Date(Date.now() - 20 * 86_400_000); // -20 jours
    factureFindUnique.mockResolvedValue(buildFacture({ dateEcheance }));
    configFindUnique.mockResolvedValue({ delaisRelancesJson: JSON.stringify([15, 30]) });

    const result = await marquerRelanceEnvoyeeUI(VALID_CUID);
    expect(result).toEqual([15]);
    expect(factureUpdate).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(
      factureUpdate.mock.calls[0][0].data.relancesEnvoyeesJson as string
    );
    expect(payload).toHaveLength(1);
    expect(payload[0].palier).toBe(15);
    expect(typeof payload[0].date).toBe("string");
  });

  it("idempotent : ne re-marque pas un palier déjà envoyé", async () => {
    const dateEcheance = new Date(Date.now() - 20 * 86_400_000);
    const existing = JSON.stringify([{ date: new Date().toISOString(), palier: 15 }]);
    factureFindUnique.mockResolvedValue(
      buildFacture({ dateEcheance, relancesEnvoyeesJson: existing })
    );
    configFindUnique.mockResolvedValue({ delaisRelancesJson: JSON.stringify([15, 30]) });

    const result = await marquerRelanceEnvoyeeUI(VALID_CUID);
    expect(result).toEqual([]);
    expect(factureUpdate).not.toHaveBeenCalled();
  });

  it("utilise les delais par défaut [15, 30, 45] si Config.delaisRelancesJson est vide", async () => {
    const dateEcheance = new Date(Date.now() - 35 * 86_400_000); // -35 jours → 15 + 30
    factureFindUnique.mockResolvedValue(buildFacture({ dateEcheance }));
    configFindUnique.mockResolvedValue({ delaisRelancesJson: null });

    const result = await marquerRelanceEnvoyeeUI(VALID_CUID);
    expect(result).toEqual([15, 30]);
  });
});

describe("getRelancesHistory", () => {
  it("retourne [] si la facture n'existe pas", async () => {
    factureFindUnique.mockResolvedValue(null);
    const h = await getRelancesHistory(VALID_CUID);
    expect(h).toEqual([]);
  });

  it("retourne [] sur JSON corrompu", async () => {
    factureFindUnique.mockResolvedValue({ relancesEnvoyeesJson: "{not json" });
    const h = await getRelancesHistory(VALID_CUID);
    expect(h).toEqual([]);
  });

  it("parse correctement un historique valide", async () => {
    const raw = JSON.stringify([
      { date: "2026-04-01T10:00:00.000Z", palier: 15 },
      { date: "2026-04-15T10:00:00.000Z", palier: 30 }
    ]);
    factureFindUnique.mockResolvedValue({ relancesEnvoyeesJson: raw });
    const h = await getRelancesHistory(VALID_CUID);
    expect(h).toHaveLength(2);
    expect(h[0]).toEqual({ date: "2026-04-01T10:00:00.000Z", palier: 15 });
  });

  it("filtre les entrées malformées du tableau", async () => {
    const raw = JSON.stringify([
      { date: "2026-04-01T10:00:00.000Z", palier: 15 },
      { palier: 30 }, // pas de date
      { date: "2026-04-15T10:00:00.000Z" }, // pas de palier
      "string corrompue"
    ]);
    factureFindUnique.mockResolvedValue({ relancesEnvoyeesJson: raw });
    const h = await getRelancesHistory(VALID_CUID);
    expect(h).toHaveLength(1);
  });
});
