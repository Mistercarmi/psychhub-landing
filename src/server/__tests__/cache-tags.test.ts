import { describe, it, expect } from "vitest";
import {
  CACHE_TAGS,
  TAGS_ON_SEANCE_CHANGE,
  TAGS_ON_FACTURE_CHANGE,
  TAGS_ON_PATIENT_CHANGE
} from "@/server/cache-tags";

describe("cache-tags", () => {
  it("exposes 5 distinct top-level tags", () => {
    const values = Object.values(CACHE_TAGS);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toHaveLength(5);
  });

  it("seance change invalidates dashboard + kpi (KPI is fed by seances)", () => {
    expect(TAGS_ON_SEANCE_CHANGE).toContain(CACHE_TAGS.dashboard);
    expect(TAGS_ON_SEANCE_CHANGE).toContain(CACHE_TAGS.kpi);
    expect(TAGS_ON_SEANCE_CHANGE).toContain(CACHE_TAGS.seances);
  });

  it("facture change invalidates kpi (factures impact KPI)", () => {
    expect(TAGS_ON_FACTURE_CHANGE).toContain(CACHE_TAGS.kpi);
    expect(TAGS_ON_FACTURE_CHANGE).toContain(CACHE_TAGS.factures);
  });

  it("patient change invalidates dashboard + kpi + patients", () => {
    expect(TAGS_ON_PATIENT_CHANGE).toContain(CACHE_TAGS.dashboard);
    expect(TAGS_ON_PATIENT_CHANGE).toContain(CACHE_TAGS.kpi);
    expect(TAGS_ON_PATIENT_CHANGE).toContain(CACHE_TAGS.patients);
  });

  it("each tag list has no duplicates", () => {
    for (const list of [TAGS_ON_SEANCE_CHANGE, TAGS_ON_FACTURE_CHANGE, TAGS_ON_PATIENT_CHANGE]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });
});
