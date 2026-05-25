import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    seance: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn()
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

vi.mock("@/server/with-audit", () => ({
  withAudit: async <T,>(opts: { fn: () => Promise<T> }) => opts.fn()
}));

import { prisma } from "@/lib/db";
import {
  listerRappelsEnAttente,
  compterRappelsEnAttente,
  marquerRappelEnvoye,
  marquerRappelsEnvoyesBatch
} from "@/server/rappels.actions";

type Mocked = ReturnType<typeof vi.fn>;
const seanceFindMany = prisma.seance.findMany as unknown as Mocked;
const seanceCount = prisma.seance.count as unknown as Mocked;
const seanceUpdateMany = prisma.seance.updateMany as unknown as Mocked;
const configFindUnique = prisma.config.findUnique as unknown as Mocked;

const VALID_CUID = "cjld2cjxh0000qzrmn831i7rn";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listerRappelsEnAttente", () => {
  it("retourne deux buckets vides quand aucune séance ne match", async () => {
    configFindUnique.mockResolvedValue({ rappelsActifs: true, rappelsHeuresAvant: 24 });
    seanceFindMany.mockResolvedValue([]);
    const r = await listerRappelsEnAttente();
    expect(r.aEnvoyer).toEqual([]);
    expect(r.enRetard).toEqual([]);
    expect(r.rappelsActifs).toBe(true);
    expect(r.rappelsHeuresAvant).toBe(24);
  });

  it("applique les filtres requis (statut PLANIFIEE, email non null, actif, rappel non envoyé)", async () => {
    configFindUnique.mockResolvedValue({ rappelsActifs: true, rappelsHeuresAvant: 24 });
    seanceFindMany.mockResolvedValue([]);
    await listerRappelsEnAttente();
    expect(seanceFindMany).toHaveBeenCalledTimes(2);
    const call0 = seanceFindMany.mock.calls[0][0];
    expect(call0.where.statut).toBe("PLANIFIEE");
    expect(call0.where.rappelEnvoyeAt).toBeNull();
    expect(call0.where.patient.email).toEqual({ not: null });
    expect(call0.where.patient.actif).toBe(true);
    // Données patient minimales (RGPD)
    expect(call0.include.patient.select).toEqual({
      id: true,
      prenom: true,
      nom: true,
      email: true
    });
  });

  it("transforme correctement les rows en SeanceRappel", async () => {
    const date = new Date("2026-05-20T14:00:00Z");
    configFindUnique.mockResolvedValue({ rappelsActifs: true, rappelsHeuresAvant: 24 });
    seanceFindMany.mockResolvedValueOnce([
      {
        id: "s1",
        date,
        dureeMinutes: 50,
        statut: "PLANIFIEE",
        patient: { id: "p1", prenom: "Marie", nom: "Dupont", email: "marie@example.fr" }
      }
    ]);
    seanceFindMany.mockResolvedValueOnce([]);
    const r = await listerRappelsEnAttente();
    expect(r.aEnvoyer).toHaveLength(1);
    expect(r.aEnvoyer[0]).toEqual({
      id: "s1",
      date,
      dureeMinutes: 50,
      statut: "PLANIFIEE",
      patientId: "p1",
      patientPrenom: "Marie",
      patientNom: "Dupont",
      patientEmail: "marie@example.fr"
    });
  });

  it("respecte la fenêtre rappelsHeuresAvant pour aEnvoyer", async () => {
    configFindUnique.mockResolvedValue({ rappelsActifs: true, rappelsHeuresAvant: 48 });
    seanceFindMany.mockResolvedValue([]);
    await listerRappelsEnAttente();
    const aEnvoyerCall = seanceFindMany.mock.calls[0][0];
    const start = aEnvoyerCall.where.date.gte as Date;
    const end = aEnvoyerCall.where.date.lte as Date;
    const diffHours = (end.getTime() - start.getTime()) / 3_600_000;
    expect(diffHours).toBeCloseTo(48, 0);
  });
});

describe("compterRappelsEnAttente", () => {
  it("retourne 0 si rappelsActifs=false", async () => {
    configFindUnique.mockResolvedValue({ rappelsActifs: false, rappelsHeuresAvant: 24 });
    const n = await compterRappelsEnAttente();
    expect(n).toBe(0);
    expect(seanceCount).not.toHaveBeenCalled();
  });

  it("compte sur la fenêtre [-24h, +Xh] si activé", async () => {
    configFindUnique.mockResolvedValue({ rappelsActifs: true, rappelsHeuresAvant: 12 });
    seanceCount.mockResolvedValue(3);
    const n = await compterRappelsEnAttente();
    expect(n).toBe(3);
    const call = seanceCount.mock.calls[0][0];
    expect(call.where.statut).toBe("PLANIFIEE");
    expect(call.where.rappelEnvoyeAt).toBeNull();
  });
});

describe("marquerRappelEnvoye", () => {
  it("rejette un id invalide", async () => {
    await expect(marquerRappelEnvoye("invalid")).rejects.toThrow(/identifiant/i);
  });

  it("retourne true quand updateMany touche 1 ligne", async () => {
    seanceUpdateMany.mockResolvedValue({ count: 1 });
    const ok = await marquerRappelEnvoye(VALID_CUID);
    expect(ok).toBe(true);
  });

  it("idempotent : retourne false quand déjà marqué", async () => {
    seanceUpdateMany.mockResolvedValue({ count: 0 });
    const ok = await marquerRappelEnvoye(VALID_CUID);
    expect(ok).toBe(false);
  });

  it("update conditionnel : ne touche que si rappelEnvoyeAt est null", async () => {
    seanceUpdateMany.mockResolvedValue({ count: 1 });
    await marquerRappelEnvoye(VALID_CUID);
    const call = seanceUpdateMany.mock.calls[0][0];
    expect(call.where.rappelEnvoyeAt).toBeNull();
    expect(call.data.rappelEnvoyeAt).toBeInstanceOf(Date);
  });
});

describe("marquerRappelsEnvoyesBatch", () => {
  it("rejette une liste vide", async () => {
    await expect(marquerRappelsEnvoyesBatch([])).rejects.toThrow(/invalide/i);
  });

  it("rejette des ids non-cuid", async () => {
    await expect(marquerRappelsEnvoyesBatch(["nope"])).rejects.toThrow(/invalide/i);
  });

  it("retourne 0 si aucune séance candidate", async () => {
    seanceFindMany.mockResolvedValue([]);
    const n = await marquerRappelsEnvoyesBatch([VALID_CUID]);
    expect(n).toBe(0);
    expect(seanceUpdateMany).not.toHaveBeenCalled();
  });

  it("audite chaque séance individuellement (cohérent avec la version unitaire)", async () => {
    seanceFindMany.mockResolvedValue([
      { id: VALID_CUID, rappelEnvoyeAt: null },
      { id: "cjld2cjxh0000qzrmn831i7ro", rappelEnvoyeAt: null }
    ]);
    seanceUpdateMany.mockResolvedValue({ count: 1 });
    const n = await marquerRappelsEnvoyesBatch([VALID_CUID, "cjld2cjxh0000qzrmn831i7ro"]);
    expect(n).toBe(2);
    // Un updateMany par séance (idempotent via where rappelEnvoyeAt: null)
    expect(seanceUpdateMany).toHaveBeenCalledTimes(2);
  });

  it("ignore les séances déjà marquées dans la fenêtre intermédiaire", async () => {
    seanceFindMany.mockResolvedValue([{ id: VALID_CUID, rappelEnvoyeAt: null }]);
    seanceUpdateMany.mockResolvedValue({ count: 0 });
    const n = await marquerRappelsEnvoyesBatch([VALID_CUID]);
    expect(n).toBe(0);
  });
});
