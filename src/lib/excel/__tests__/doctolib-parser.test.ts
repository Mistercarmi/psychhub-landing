import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  parseDoctolibXlsxDetailed,
  normalizeStatut,
  normalizeKey,
  pickCol,
  parseDateValue
} from "@/lib/excel/doctolib-parser";

async function buildXlsx(
  headers: string[],
  rows: Array<Array<string | number | Date>>
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.addRow(headers);
  for (const r of rows) ws.addRow(r);
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

describe("normalizeKey", () => {
  it("removes accents and collapses separators", () => {
    expect(normalizeKey("Prénom")).toBe("prenom");
    expect(normalizeKey("Date_RDV")).toBe("date rdv");
    expect(normalizeKey("  Nom__patient  ")).toBe("nom patient");
  });
});

describe("normalizeStatut", () => {
  it("maps confirmed variants → PLANIFIEE", () => {
    expect(normalizeStatut("Confirmé")).toBe("PLANIFIEE");
    expect(normalizeStatut("CONFIRMEE")).toBe("PLANIFIEE");
    expect(normalizeStatut("planifié")).toBe("PLANIFIEE");
  });
  it("maps honored variants → HONOREE", () => {
    expect(normalizeStatut("Honoré")).toBe("HONOREE");
    expect(normalizeStatut("Réalisée")).toBe("HONOREE");
    expect(normalizeStatut("completed")).toBe("HONOREE");
  });
  it("maps cancelled patient → ANNULEE_PATIENT", () => {
    expect(normalizeStatut("Annulé")).toBe("ANNULEE_PATIENT");
    expect(normalizeStatut("Annulé par le patient")).toBe("ANNULEE_PATIENT");
    expect(normalizeStatut("canceled")).toBe("ANNULEE_PATIENT");
  });
  it("maps cancelled praticien → ANNULEE_PRATICIEN", () => {
    expect(normalizeStatut("Annulé par le praticien")).toBe("ANNULEE_PRATICIEN");
  });
  it("maps absent variants → ABSENCE", () => {
    expect(normalizeStatut("Absent")).toBe("ABSENCE");
    expect(normalizeStatut("no-show")).toBe("ABSENCE");
    expect(normalizeStatut("non honoré")).toBe("ABSENCE");
  });
  it("falls back to PLANIFIEE for unknown values", () => {
    expect(normalizeStatut("xyz")).toBe("PLANIFIEE");
    expect(normalizeStatut("")).toBe("PLANIFIEE");
  });
});

describe("pickCol", () => {
  it("matches exact normalized header first", () => {
    expect(pickCol(["Date", "Date du RDV"], ["date"])).toBe(0);
  });
  it("matches startsWith if no exact", () => {
    expect(pickCol(["Date du RDV"], ["date"])).toBe(0);
  });
  it("returns -1 when no candidate matches", () => {
    expect(pickCol(["Foo", "Bar"], ["baz"])).toBe(-1);
  });
});

describe("parseDateValue", () => {
  it("returns Date for Date input", () => {
    const d = new Date("2026-05-16T10:00:00");
    expect(parseDateValue(d)).toBe(d);
  });
  it("parses dd/mm/yyyy", () => {
    const d = parseDateValue("16/05/2026");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(4);
    expect(d!.getDate()).toBe(16);
  });
  it("parses dd/mm/yyyy hh:mm", () => {
    const d = parseDateValue("16/05/2026 14:30");
    expect(d!.getHours()).toBe(14);
    expect(d!.getMinutes()).toBe(30);
  });
  it("parses ISO strings", () => {
    expect(parseDateValue("2026-05-16T10:00:00")).not.toBeNull();
  });
  it("returns null for invalid", () => {
    expect(parseDateValue("pas une date")).toBeNull();
    expect(parseDateValue("")).toBeNull();
    expect(parseDateValue(null)).toBeNull();
  });
});

describe("parseDoctolibXlsxDetailed", () => {
  it("parses a standard Doctolib export (FR headers)", async () => {
    const buf = await buildXlsx(
      ["Date du RDV", "Nom", "Prénom", "Email", "Statut", "Durée", "Référence"],
      [
        ["16/05/2026 10:00", "Durand", "Marie", "marie@x.fr", "Confirmé", 50, "REF001"],
        ["17/05/2026 11:00", "Martin", "Paul", "", "Honoré", 60, "REF002"]
      ]
    );
    const res = await parseDoctolibXlsxDetailed(buf);
    expect(res.rows).toHaveLength(2);
    expect(res.errors).toHaveLength(0);
    expect(res.rows[0].statut).toBe("PLANIFIEE");
    expect(res.rows[1].statut).toBe("HONOREE");
    expect(res.rows[0].dureeMinutes).toBe(50);
    expect(res.rows[1].patientEmail).toBeNull();
    expect(res.detectedColumns.date).toBeGreaterThanOrEqual(0);
    expect(res.detectedColumns.nom).toBeGreaterThanOrEqual(0);
  });

  it("tolerates reordered columns", async () => {
    const buf = await buildXlsx(
      ["Prénom", "Nom", "Statut", "Date"],
      [["Marie", "Durand", "Annulé par le praticien", "16/05/2026 10:00"]]
    );
    const res = await parseDoctolibXlsxDetailed(buf);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].statut).toBe("ANNULEE_PRATICIEN");
  });

  it("tolerates English column names", async () => {
    const buf = await buildXlsx(
      ["First name", "Last name", "Status", "Date"],
      [["Marie", "Durand", "completed", "2026-05-16T10:00:00"]]
    );
    const res = await parseDoctolibXlsxDetailed(buf);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].statut).toBe("HONOREE");
    expect(res.rows[0].patientPrenom).toBe("Marie");
  });

  it("reports errors for invalid date but keeps other rows", async () => {
    const buf = await buildXlsx(
      ["Date", "Nom", "Prénom"],
      [
        ["pas une date", "Durand", "Marie"],
        ["16/05/2026", "Martin", "Paul"]
      ]
    );
    const res = await parseDoctolibXlsxDetailed(buf);
    expect(res.rows).toHaveLength(1);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].field).toBe("date");
    expect(res.rows[0].patientNom).toBe("Martin");
  });

  it("counts skipped rows with no patient name", async () => {
    const buf = await buildXlsx(
      ["Date", "Nom", "Prénom"],
      [
        ["", "", ""],
        ["16/05/2026", "Martin", "Paul"]
      ]
    );
    const res = await parseDoctolibXlsxDetailed(buf);
    expect(res.rows).toHaveLength(1);
    // Une ligne vide est skippée (pas d'erreur)
    expect(res.skipped).toBeGreaterThanOrEqual(0);
  });

  it("generates a ref when none provided", async () => {
    const buf = await buildXlsx(
      ["Date", "Nom", "Prénom"],
      [["16/05/2026 10:00", "Durand", "Marie"]]
    );
    const res = await parseDoctolibXlsxDetailed(buf);
    expect(res.rows[0].doctolibRef).toContain("durand");
    expect(res.rows[0].doctolibRef).toContain("marie");
  });
});
