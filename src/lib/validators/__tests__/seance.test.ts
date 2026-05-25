import { describe, it, expect } from "vitest";
import { seanceSchema } from "@/lib/validators/seance";

describe("seanceSchema", () => {
  const base = {
    patientId: "patient-1",
    date: "2026-05-16T10:00:00",
    dureeMinutes: 50,
    tarif: 60
  };

  it("accepts minimal valid input", () => {
    const r = seanceSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.success && r.data.statut).toBe("PLANIFIEE");
  });

  it("coerces date strings", () => {
    const r = seanceSchema.safeParse({ ...base, date: "2026-05-16T10:00:00" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.date).toBeInstanceOf(Date);
  });

  it("rejects empty patientId", () => {
    const r = seanceSchema.safeParse({ ...base, patientId: "" });
    expect(r.success).toBe(false);
  });

  it("rejects negative tarif", () => {
    const r = seanceSchema.safeParse({ ...base, tarif: -10 });
    expect(r.success).toBe(false);
  });

  it("rejects zero or negative duration", () => {
    expect(seanceSchema.safeParse({ ...base, dureeMinutes: 0 }).success).toBe(false);
    expect(seanceSchema.safeParse({ ...base, dureeMinutes: -5 }).success).toBe(false);
  });

  it("accepts all valid statuts", () => {
    const statuts = ["PLANIFIEE", "HONOREE", "ANNULEE_PATIENT", "ANNULEE_PRATICIEN", "ABSENCE"] as const;
    for (const s of statuts) {
      expect(seanceSchema.safeParse({ ...base, statut: s }).success).toBe(true);
    }
  });

  it("rejects unknown statut", () => {
    const r = seanceSchema.safeParse({ ...base, statut: "FOO" });
    expect(r.success).toBe(false);
  });
});
