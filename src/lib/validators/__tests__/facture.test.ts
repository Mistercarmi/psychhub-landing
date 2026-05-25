import { describe, it, expect } from "vitest";
import {
  computeFactureTotals,
  factureBrouillonUpdateSchema,
  ligneLibreSchema
} from "@/lib/validators/facture";

describe("computeFactureTotals", () => {
  it("sums seances and rounds to 2 decimals", () => {
    const t = computeFactureTotals({
      seances: [{ tarif: 60 }, { tarif: 50 }, { tarif: 70 }]
    });
    expect(t.montantHT).toBe(180);
    expect(t.montantTVA).toBe(0);
    expect(t.montantTTC).toBe(180);
  });

  it("applies TVA correctly", () => {
    const t = computeFactureTotals({
      seances: [{ tarif: 100 }],
      tva: 20
    });
    expect(t.montantHT).toBe(100);
    expect(t.montantTVA).toBe(20);
    expect(t.montantTTC).toBe(120);
  });

  it("includes ligne libre HT in totals", () => {
    const t = computeFactureTotals({
      seances: [{ tarif: 60 }],
      lignesLibres: [{ description: "Bilan", montant: 80, quantite: 1 }]
    });
    expect(t.montantHT).toBe(140);
  });

  it("multiplies ligne libre by quantite", () => {
    const t = computeFactureTotals({
      seances: [],
      lignesLibres: [{ description: "Pack 5", montant: 50, quantite: 5 }]
    });
    expect(t.montantHT).toBe(250);
  });

  it("computes soldeDu by subtracting acompte", () => {
    const t = computeFactureTotals({
      seances: [{ tarif: 100 }],
      tva: 0,
      acompte: 30
    });
    expect(t.montantTTC).toBe(100);
    expect(t.acompte).toBe(30);
    expect(t.soldeDu).toBe(70);
  });

  it("clamps soldeDu to 0 when acompte > TTC (overpayment)", () => {
    const t = computeFactureTotals({
      seances: [{ tarif: 100 }],
      acompte: 200
    });
    expect(t.soldeDu).toBe(0);
  });

  it("ignores non-finite tarifs gracefully", () => {
    const t = computeFactureTotals({
      seances: [{ tarif: 60 }, { tarif: Number.NaN }]
    });
    expect(t.montantHT).toBe(60);
  });

  it("rounds TVA computation to 2 decimals (no float drift)", () => {
    const t = computeFactureTotals({
      seances: [{ tarif: 33.33 }, { tarif: 33.33 }, { tarif: 33.33 }],
      tva: 20
    });
    expect(t.montantHT).toBe(99.99);
    expect(t.montantTVA).toBe(20);
    expect(t.montantTTC).toBe(119.99);
  });
});

describe("ligneLibreSchema", () => {
  it("accepts valid ligne libre", () => {
    expect(
      ligneLibreSchema.safeParse({ description: "Bilan", montant: 80, quantite: 1 }).success
    ).toBe(true);
  });

  it("rejects empty description", () => {
    expect(
      ligneLibreSchema.safeParse({ description: "", montant: 80, quantite: 1 }).success
    ).toBe(false);
  });

  it("coerces string numbers", () => {
    const r = ligneLibreSchema.safeParse({ description: "X", montant: "12.5", quantite: "2" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.montant).toBe(12.5);
      expect(r.data.quantite).toBe(2);
    }
  });

  it("rejects non-positive quantite", () => {
    expect(
      ligneLibreSchema.safeParse({ description: "X", montant: 10, quantite: 0 }).success
    ).toBe(false);
  });
});

describe("factureBrouillonUpdateSchema", () => {
  it("accepts partial updates", () => {
    expect(factureBrouillonUpdateSchema.safeParse({ tva: 20 }).success).toBe(true);
    expect(factureBrouillonUpdateSchema.safeParse({ notes: "test" }).success).toBe(true);
    expect(factureBrouillonUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("rejects out-of-range TVA", () => {
    expect(factureBrouillonUpdateSchema.safeParse({ tva: -1 }).success).toBe(false);
    expect(factureBrouillonUpdateSchema.safeParse({ tva: 101 }).success).toBe(false);
  });

  it("accepts null for nullable fields", () => {
    expect(
      factureBrouillonUpdateSchema.safeParse({ notes: null, dateEcheance: null }).success
    ).toBe(true);
  });
});
