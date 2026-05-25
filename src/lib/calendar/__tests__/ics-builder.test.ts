import { describe, it, expect } from "vitest";
import { buildIcs, type IcsEvent } from "@/lib/calendar/ics-builder";

const SAMPLE: IcsEvent = {
  uid: "evt-1@psychhub.local",
  start: new Date("2026-05-16T10:00:00Z"),
  durationMinutes: 50,
  summary: "Séance — Marie Durand",
  description: "Patient régulier",
  location: "12 rue de Paris",
  status: "CONFIRMED",
  lastModified: new Date("2026-05-15T08:00:00Z")
};

describe("buildIcs", () => {
  it("produces a valid VCALENDAR envelope", () => {
    const ics = buildIcs([SAMPLE]);
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toMatch(/END:VCALENDAR$/);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//PsychHub//Cabinet//FR");
  });

  it("emits one VEVENT per event with UID/DTSTART/DTEND", () => {
    const ics = buildIcs([SAMPLE]);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("UID:evt-1@psychhub.local");
    expect(ics).toContain("DTSTART:20260516T100000Z");
    expect(ics).toContain("DTEND:20260516T105000Z");
    expect(ics).toContain("STATUS:CONFIRMED");
  });

  it("escapes special characters in summary/description", () => {
    const ics = buildIcs([
      {
        ...SAMPLE,
        summary: "Séance ; spéciale, avec\nretour"
      }
    ]);
    expect(ics).toContain("\\;");
    expect(ics).toContain("\\,");
    expect(ics).toContain("\\n");
  });

  it("supports multiple events", () => {
    const ics = buildIcs([SAMPLE, { ...SAMPLE, uid: "evt-2@psychhub.local" }]);
    const matches = ics.match(/BEGIN:VEVENT/g);
    expect(matches).toHaveLength(2);
  });

  it("includes custom calendar name when provided", () => {
    const ics = buildIcs([SAMPLE], { calName: "Mon cabinet" });
    expect(ics).toContain("X-WR-CALNAME:Mon cabinet");
  });

  it("folds long UIDs over 75 octets", () => {
    const longUid = "a".repeat(150);
    const ics = buildIcs([{ ...SAMPLE, uid: longUid }]);
    // Une ligne pliée commence par CRLF + espace
    expect(ics).toMatch(/UID:a+\r\n /);
  });

  it("handles event without optional fields", () => {
    const minimal: IcsEvent = {
      uid: "evt-3",
      start: new Date("2026-05-16T10:00:00Z"),
      durationMinutes: 30,
      summary: "Test"
    };
    const ics = buildIcs([minimal]);
    expect(ics).toContain("UID:evt-3");
    expect(ics).not.toContain("DESCRIPTION:");
    expect(ics).not.toContain("LOCATION:");
  });
});
