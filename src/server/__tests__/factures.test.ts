import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    facture: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    },
    seance: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    config: {
      findUnique: vi.fn()
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({})
    },
    $transaction: vi.fn()
  }
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn()
}));

vi.mock("@/server/with-audit", () => ({
  withAudit: async <T,>(opts: { fn: () => Promise<T> }) => opts.fn()
}));

vi.mock("@/server/cache-tags", () => ({
  TAGS_ON_FACTURE_CHANGE: []
}));

import { prisma } from "@/lib/db";
import {
  emettreFacture,
  createFactureBrouillon
} from "@/server/factures.actions";

type Mocked = ReturnType<typeof vi.fn>;
const factureFindUnique = prisma.facture.findUnique as unknown as Mocked;
const configFindUnique = prisma.config.findUnique as unknown as Mocked;
const seanceFindMany = prisma.seance.findMany as unknown as Mocked;
const $transaction = prisma.$transaction as unknown as Mocked;

const VALID_PATIENT_CUID = "cjld2cjxh0000qzrmn831i7rn";
const VALID_SEANCE_CUID = "cjld2cjxh0000qzrmn831i7ro";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("emettreFacture — transaction anti-race", () => {
  it("rejette si la facture n'existe pas", async () => {
    factureFindUnique.mockResolvedValue(null);
    await expect(emettreFacture("any")).rejects.toThrow(/introuvable/i);
  });

  it("rejette si la facture n'est pas un brouillon", async () => {
    factureFindUnique.mockResolvedValue({ id: "f1", statut: "EMISE" });
    await expect(emettreFacture("f1")).rejects.toThrow(/brouillon/i);
  });

  it("encapsule la lecture du dernier numéro + l'update dans $transaction", async () => {
    factureFindUnique.mockResolvedValue({ id: "f1", statut: "BROUILLON" });
    configFindUnique.mockResolvedValue({ prefixeFacture: "F" });

    const txClient = {
      facture: {
        findFirst: vi.fn().mockResolvedValue({ numero: "F2026-0007" }),
        update: vi.fn().mockResolvedValue({ id: "f1", numero: "F2026-0008", statut: "EMISE" })
      }
    };
    $transaction.mockImplementation(async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient));

    const updated = await emettreFacture("f1");

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(txClient.facture.findFirst).toHaveBeenCalledTimes(1);
    expect(txClient.facture.update).toHaveBeenCalledTimes(1);
    expect(txClient.facture.update.mock.calls[0][0].data.numero).toBe("F2026-0008");
    expect(updated).toMatchObject({ statut: "EMISE", numero: "F2026-0008" });
  });

  it("démarre à 0001 si aucune facture émise n'existe pour l'année courante", async () => {
    factureFindUnique.mockResolvedValue({ id: "f1", statut: "BROUILLON" });
    configFindUnique.mockResolvedValue({ prefixeFacture: "F" });

    let captured = "";
    const txClient = {
      facture: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockImplementation((arg: { data: { numero: string } }) => {
          captured = arg.data.numero;
          return Promise.resolve({ id: "f1", numero: captured });
        })
      }
    };
    $transaction.mockImplementation(async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient));

    await emettreFacture("f1");
    expect(captured).toMatch(/^F\d{4}-0001$/);
  });
});

describe("createFactureBrouillon — validation Zod", () => {
  it("rejette un patientId non-cuid", async () => {
    await expect(
      createFactureBrouillon({
        patientId: "not-a-cuid",
        seanceIds: [VALID_SEANCE_CUID]
      })
    ).rejects.toThrow();
  });

  it("rejette un seanceIds vide", async () => {
    await expect(
      createFactureBrouillon({
        patientId: VALID_PATIENT_CUID,
        seanceIds: []
      })
    ).rejects.toThrow();
  });

  it("rejette un tva hors bornes (>100)", async () => {
    await expect(
      createFactureBrouillon({
        patientId: VALID_PATIENT_CUID,
        seanceIds: [VALID_SEANCE_CUID],
        tva: 150
      })
    ).rejects.toThrow();
  });

  it("rejette des seanceIds non-cuid", async () => {
    await expect(
      createFactureBrouillon({
        patientId: VALID_PATIENT_CUID,
        seanceIds: ["not-cuid"]
      })
    ).rejects.toThrow();
  });

  it("appelle Prisma quand l'input est valide", async () => {
    seanceFindMany.mockResolvedValue([{ id: VALID_SEANCE_CUID, tarif: 60 }]);
    $transaction.mockResolvedValue({ id: "f-new" });
    await createFactureBrouillon({
      patientId: VALID_PATIENT_CUID,
      seanceIds: [VALID_SEANCE_CUID],
      tva: 20
    });
    expect(seanceFindMany).toHaveBeenCalled();
    expect($transaction).toHaveBeenCalled();
  });
});
