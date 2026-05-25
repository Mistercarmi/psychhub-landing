import { describe, it, expect } from "vitest";
import {
  resolveRange,
  previousPeriod,
  rangeToSearchParams,
  rangeFromSearchParams,
  isSameRange,
  formatRangeLabel
} from "@/lib/date-range";

const ANCHOR = new Date("2026-05-16T12:00:00");

describe("resolveRange", () => {
  it("today returns same-day start/end", () => {
    const r = resolveRange("today", ANCHOR)!;
    expect(r.from.getHours()).toBe(0);
    expect(r.to.getHours()).toBe(23);
    expect(r.from.toDateString()).toBe(r.to.toDateString());
  });

  it("last7 spans 7 inclusive days", () => {
    const r = resolveRange("last7", ANCHOR)!;
    const diffDays = Math.round((r.to.getTime() - r.from.getTime()) / 86_400_000);
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(7);
  });

  it("thisMonth covers the full anchor month", () => {
    const r = resolveRange("thisMonth", ANCHOR)!;
    expect(r.from.getDate()).toBe(1);
    expect(r.from.getMonth()).toBe(ANCHOR.getMonth());
    expect(r.to.getMonth()).toBe(ANCHOR.getMonth());
  });

  it("lastYear covers the previous full year", () => {
    const r = resolveRange("lastYear", ANCHOR)!;
    expect(r.from.getFullYear()).toBe(ANCHOR.getFullYear() - 1);
    expect(r.from.getMonth()).toBe(0);
    expect(r.to.getMonth()).toBe(11);
  });

  it("custom returns null (caller-driven)", () => {
    expect(resolveRange("custom", ANCHOR)).toBeNull();
  });
});

describe("previousPeriod", () => {
  it("prev shifts by same duration backwards", () => {
    const range = resolveRange("thisMonth", ANCHOR)!;
    const prev = previousPeriod(range, "prev");
    expect(prev.to.getTime()).toBeLessThan(range.from.getTime());
    // La durée doit être conservée à ~1 jour près (mois de longueurs différentes)
    const lenA = range.to.getTime() - range.from.getTime();
    const lenB = prev.to.getTime() - prev.from.getTime();
    expect(Math.abs(lenA - lenB)).toBeLessThan(2 * 86_400_000);
  });

  it("yoy shifts exactly one year backwards", () => {
    const range = resolveRange("thisYear", ANCHOR)!;
    const yoy = previousPeriod(range, "yoy");
    expect(yoy.from.getFullYear()).toBe(range.from.getFullYear() - 1);
    expect(yoy.to.getFullYear()).toBe(range.to.getFullYear() - 1);
  });
});

describe("searchParams round-trip", () => {
  it("round-trips a custom range", () => {
    const original = { from: new Date("2026-01-01T00:00:00"), to: new Date("2026-03-31T23:59:59.999") };
    const params = rangeToSearchParams(original, "custom");
    const { range, preset } = rangeFromSearchParams({
      from: params.from!,
      to: params.to!,
      preset: params.preset!
    });
    expect(preset).toBe("custom");
    expect(range).not.toBeNull();
    expect(range!.from.getFullYear()).toBe(2026);
    expect(range!.from.getMonth()).toBe(0);
    expect(range!.to.getMonth()).toBe(2);
  });

  it("preset takes precedence over from/to when set", () => {
    const { range, preset } = rangeFromSearchParams({
      from: "1999-01-01",
      to: "1999-12-31",
      preset: "thisMonth"
    });
    expect(preset).toBe("thisMonth");
    expect(range!.from.getFullYear()).not.toBe(1999);
  });

  it("empty params return null range", () => {
    const { range } = rangeFromSearchParams({});
    expect(range).toBeNull();
  });
});

describe("isSameRange / formatRangeLabel", () => {
  it("isSameRange detects equality and difference", () => {
    const a = { from: new Date("2026-01-01"), to: new Date("2026-01-31") };
    const b = { from: new Date("2026-01-01"), to: new Date("2026-01-31") };
    const c = { from: new Date("2026-02-01"), to: new Date("2026-02-28") };
    expect(isSameRange(a, b)).toBe(true);
    expect(isSameRange(a, c)).toBe(false);
    expect(isSameRange(null, null)).toBe(true);
    expect(isSameRange(a, null)).toBe(false);
  });

  it("formatRangeLabel returns 'Toute la période' for null", () => {
    expect(formatRangeLabel(null)).toBe("Toute la période");
  });

  it("formatRangeLabel returns single date when from === to", () => {
    const same = new Date("2026-05-16T10:00:00");
    const label = formatRangeLabel({ from: same, to: same });
    expect(label).not.toContain("→");
  });
});
