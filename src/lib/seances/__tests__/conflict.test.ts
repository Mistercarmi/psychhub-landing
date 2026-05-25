import { describe, it, expect } from "vitest";
import { intervalsOverlap, SeanceConflictError } from "@/lib/seances/conflict";

describe("intervalsOverlap", () => {
  const base = new Date("2026-05-16T10:00:00");

  it("returns false when intervals are completely separate", () => {
    const a = base;
    const b = new Date("2026-05-16T12:00:00");
    expect(intervalsOverlap(a, 50, b, 50)).toBe(false);
  });

  it("returns true when intervals overlap by a few minutes", () => {
    const a = base; // 10:00 → 10:50
    const b = new Date("2026-05-16T10:30:00"); // 10:30 → 11:20
    expect(intervalsOverlap(a, 50, b, 50)).toBe(true);
  });

  it("returns true when one interval contains another", () => {
    const a = base; // 10:00 → 11:30
    const b = new Date("2026-05-16T10:30:00"); // 10:30 → 11:00
    expect(intervalsOverlap(a, 90, b, 30)).toBe(true);
  });

  it("returns false when they touch exactly at boundary (no overlap)", () => {
    const a = base; // 10:00 → 10:50
    const b = new Date("2026-05-16T10:50:00"); // 10:50 → 11:40
    expect(intervalsOverlap(a, 50, b, 50)).toBe(false);
  });

  it("returns true regardless of order (commutative)", () => {
    const a = base;
    const b = new Date("2026-05-16T10:30:00");
    expect(intervalsOverlap(a, 50, b, 50)).toBe(intervalsOverlap(b, 50, a, 50));
  });

  it("returns true for two zero-duration events at same instant", () => {
    // Edge case : durée 0 → [a, a) ouvert. Mathématiquement aucun chevauchement.
    expect(intervalsOverlap(base, 0, base, 0)).toBe(false);
  });

  it("returns false when second event ends before first starts", () => {
    const a = base; // 10:00 → 10:50
    const b = new Date("2026-05-16T09:00:00"); // 09:00 → 09:30
    expect(intervalsOverlap(a, 50, b, 30)).toBe(false);
  });
});

describe("SeanceConflictError", () => {
  it("carries the list of conflicting seances", () => {
    const conflicts = [
      {
        id: "s1",
        date: new Date("2026-05-16T10:00:00"),
        dureeMinutes: 50,
        patientId: "p1",
        patientLabel: "Marie Durand"
      }
    ];
    const err = new SeanceConflictError(conflicts);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SeanceConflictError");
    expect(err.conflicts).toHaveLength(1);
    expect(err.message).toContain("Marie Durand");
  });

  it("mentions count in the message", () => {
    const conflicts = [
      { id: "s1", date: new Date(), dureeMinutes: 50, patientId: "p1", patientLabel: "A B" },
      { id: "s2", date: new Date(), dureeMinutes: 50, patientId: "p2", patientLabel: "C D" }
    ];
    const err = new SeanceConflictError(conflicts);
    expect(err.message).toContain("2");
  });
});
