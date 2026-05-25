import { describe, it, expect } from "vitest";
import {
  TRANSFORMERS,
  compose,
  applyFieldPipelines
} from "@/lib/import/transformers";

describe("trim", () => {
  it("trims whitespace", () => {
    expect(TRANSFORMERS.trim("  hello  ")).toBe("hello");
  });
  it("converts null to empty string", () => {
    expect(TRANSFORMERS.trim(null)).toBe("");
    expect(TRANSFORMERS.trim(undefined)).toBe("");
  });
});

describe("normalizePhone", () => {
  it("normalizes FR phone to E.164", () => {
    expect(TRANSFORMERS.normalizePhone("06.12.34.56.78")).toBe("+33612345678");
    expect(TRANSFORMERS.normalizePhone("06 12 34 56 78")).toBe("+33612345678");
  });
  it("keeps already E.164", () => {
    expect(TRANSFORMERS.normalizePhone("+33612345678")).toBe("+33612345678");
  });
  it("returns original on invalid", () => {
    expect(TRANSFORMERS.normalizePhone("not-a-phone")).toBe("not-a-phone");
  });
  it("returns empty for empty input", () => {
    expect(TRANSFORMERS.normalizePhone("")).toBe("");
    expect(TRANSFORMERS.normalizePhone(null)).toBe("");
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(TRANSFORMERS.normalizeEmail("  MARIE@Example.com ")).toBe("marie@example.com");
  });
});

describe("parseFrenchDate", () => {
  it("parses dd/mm/yyyy", () => {
    const iso = TRANSFORMERS.parseFrenchDate("16/05/2026");
    expect(iso).toBeTruthy();
    expect(new Date(iso).getFullYear()).toBe(2026);
    expect(new Date(iso).getMonth()).toBe(4);
  });
  it("parses dd-mm-yyyy", () => {
    expect(TRANSFORMERS.parseFrenchDate("16-05-2026")).toBeTruthy();
  });
  it("parses dd/mm/yyyy hh:mm", () => {
    const iso = TRANSFORMERS.parseFrenchDate("16/05/2026 14:30");
    const d = new Date(iso);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });
  it("parses ISO", () => {
    expect(TRANSFORMERS.parseFrenchDate("2026-05-16")).toBeTruthy();
  });
  it("returns empty for invalid", () => {
    expect(TRANSFORMERS.parseFrenchDate("pas une date")).toBe("");
    expect(TRANSFORMERS.parseFrenchDate("")).toBe("");
  });
  it("handles Date instance input", () => {
    expect(TRANSFORMERS.parseFrenchDate(new Date("2026-05-16"))).toBeTruthy();
  });
});

describe("titleCase", () => {
  it("capitalizes first letter of each word", () => {
    expect(TRANSFORMERS.titleCase("DURAND")).toBe("Durand");
    expect(TRANSFORMERS.titleCase("marie durand")).toBe("Marie Durand");
  });
  it("handles hyphens", () => {
    expect(TRANSFORMERS.titleCase("jean-michel")).toBe("Jean-Michel");
  });
  it("handles apostrophes", () => {
    expect(TRANSFORMERS.titleCase("d'arc")).toBe("D'Arc");
  });
  it("returns empty for empty input", () => {
    expect(TRANSFORMERS.titleCase("")).toBe("");
  });
});

describe("numericFromFrLocale", () => {
  it("parses '60,50' as 60.5", () => {
    expect(TRANSFORMERS.numericFromFrLocale("60,50")).toBe(60.5);
  });
  it("parses '1 234,56' as 1234.56", () => {
    expect(TRANSFORMERS.numericFromFrLocale("1 234,56")).toBe(1234.56);
  });
  it("keeps number unchanged", () => {
    expect(TRANSFORMERS.numericFromFrLocale(42)).toBe(42);
  });
  it("returns null for non-numeric", () => {
    expect(TRANSFORMERS.numericFromFrLocale("abc")).toBeNull();
    expect(TRANSFORMERS.numericFromFrLocale("")).toBeNull();
    expect(TRANSFORMERS.numericFromFrLocale(null)).toBeNull();
  });
});

describe("parseBool", () => {
  it("recognizes truthy strings", () => {
    expect(TRANSFORMERS.parseBool("true")).toBe(true);
    expect(TRANSFORMERS.parseBool("oui")).toBe(true);
    expect(TRANSFORMERS.parseBool("1")).toBe(true);
    expect(TRANSFORMERS.parseBool("VRAI")).toBe(true);
  });
  it("returns false otherwise", () => {
    expect(TRANSFORMERS.parseBool("non")).toBe(false);
    expect(TRANSFORMERS.parseBool("")).toBe(false);
    expect(TRANSFORMERS.parseBool(null)).toBe(false);
  });
});

describe("emptyToNull", () => {
  it("converts empty string to null", () => {
    expect(TRANSFORMERS.emptyToNull("")).toBeNull();
    expect(TRANSFORMERS.emptyToNull("  ")).toBeNull();
  });
  it("keeps non-empty values", () => {
    expect(TRANSFORMERS.emptyToNull("hello")).toBe("hello");
    expect(TRANSFORMERS.emptyToNull(42)).toBe(42);
  });
});

describe("compose", () => {
  it("chains transformers left to right", () => {
    const f = compose("trim", "normalizeEmail");
    expect(f("  MARIE@X.com  ")).toBe("marie@x.com");
  });
  it("titleCase after trim", () => {
    const f = compose("trim", "titleCase");
    expect(f("  durand  ")).toBe("Durand");
  });
});

describe("applyFieldPipelines", () => {
  it("applies different pipelines per field", () => {
    const out = applyFieldPipelines(
      {
        nom: "DURAND",
        email: "  Marie@Example.COM ",
        telephone: "06.12.34.56.78",
        tarif: "60,50"
      },
      {
        nom: ["trim", "titleCase"],
        email: ["normalizeEmail"],
        telephone: ["normalizePhone"],
        tarif: ["numericFromFrLocale"]
      }
    );
    expect(out.nom).toBe("Durand");
    expect(out.email).toBe("marie@example.com");
    expect(out.telephone).toBe("+33612345678");
    expect(out.tarif).toBe(60.5);
  });
  it("leaves fields not in pipeline untouched", () => {
    const out = applyFieldPipelines({ nom: "X", extra: "Y" }, { nom: ["trim"] });
    expect(out.extra).toBe("Y");
  });
});
