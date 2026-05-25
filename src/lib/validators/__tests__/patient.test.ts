import { describe, it, expect } from "vitest";
import { patientSchema } from "@/lib/validators/patient";
import { ibanSchema, phoneSchema, siretSchema, numeroSecuSchema } from "@/lib/validators/common";

describe("patientSchema", () => {
  it("accepts minimal patient (nom + prenom)", () => {
    const r = patientSchema.safeParse({ nom: "Durand", prenom: "Marie" });
    expect(r.success).toBe(true);
  });

  it("rejects empty nom", () => {
    const r = patientSchema.safeParse({ nom: "", prenom: "Marie" });
    expect(r.success).toBe(false);
  });

  it("accepts empty optional fields", () => {
    const r = patientSchema.safeParse({
      nom: "X",
      prenom: "Y",
      email: "",
      telephone: "",
      numeroSecu: ""
    });
    expect(r.success).toBe(true);
  });

  it("rejects malformed email", () => {
    const r = patientSchema.safeParse({ nom: "X", prenom: "Y", email: "pas-un-email" });
    expect(r.success).toBe(false);
  });
});

describe("phoneSchema (FR)", () => {
  it("accepts valid FR mobile", () => {
    expect(phoneSchema.safeParse("06 12 34 56 78").success).toBe(true);
    expect(phoneSchema.safeParse("+33 6 12 34 56 78").success).toBe(true);
  });
  it("rejects gibberish", () => {
    expect(phoneSchema.safeParse("not-a-phone").success).toBe(false);
  });
  it("accepts empty string", () => {
    expect(phoneSchema.safeParse("").success).toBe(true);
  });
});

describe("siretSchema (Luhn 14)", () => {
  it("accepts a valid SIRET", () => {
    // SIRET Anthropic-fictif valide Luhn : 73282932000074 (exemple INSEE)
    expect(siretSchema.safeParse("73282932000074").success).toBe(true);
  });
  it("rejects wrong length", () => {
    expect(siretSchema.safeParse("12345").success).toBe(false);
  });
  it("rejects bad Luhn", () => {
    expect(siretSchema.safeParse("12345678901234").success).toBe(false);
  });
  it("accepts empty", () => {
    expect(siretSchema.safeParse("").success).toBe(true);
  });
});

describe("numeroSecuSchema (INSEE)", () => {
  it("accepts 13-digit without key", () => {
    expect(numeroSecuSchema.safeParse("1850578006048").success).toBe(true);
  });
  it("rejects wrong length", () => {
    expect(numeroSecuSchema.safeParse("12345").success).toBe(false);
  });
  it("accepts empty", () => {
    expect(numeroSecuSchema.safeParse("").success).toBe(true);
  });
  it("rejects wrong key (15 digits)", () => {
    // 13 chiffres + clé incorrecte (00)
    expect(numeroSecuSchema.safeParse("185057800604800").success).toBe(false);
  });
});

describe("ibanSchema", () => {
  it("accepts a valid FR IBAN", () => {
    // FR IBAN test
    expect(ibanSchema.safeParse("FR14 2004 1010 0505 0001 3M02 606").success).toBe(true);
  });
  it("rejects invalid checksum", () => {
    expect(ibanSchema.safeParse("FR14 0000 0000 0000 0000 0000 000").success).toBe(false);
  });
});
