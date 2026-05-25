import { describe, it, expect } from "vitest";
import { sortRows, type ResponsiveColumn } from "@/components/shared/responsive-table";

interface Row {
  id: string;
  name: string;
  age: number;
  date: Date;
}

const rows: Row[] = [
  { id: "1", name: "Charlie", age: 30, date: new Date("2026-01-15") },
  { id: "2", name: "Alice", age: 25, date: new Date("2026-03-10") },
  { id: "3", name: "Bob", age: 35, date: new Date("2026-02-20") }
];

const columns: ResponsiveColumn<Row>[] = [
  { key: "name", label: "Nom", cell: (r) => r.name, sortValue: (r) => r.name },
  { key: "age", label: "Âge", cell: (r) => r.age, sortValue: (r) => r.age },
  { key: "date", label: "Date", cell: (r) => String(r.date), sortValue: (r) => r.date },
  { key: "no-sort", label: "X", cell: (r) => r.id }
];

describe("sortRows", () => {
  it("returns rows unchanged when sort is null", () => {
    expect(sortRows(rows, columns, null).map((r) => r.id)).toEqual(["1", "2", "3"]);
  });

  it("sorts strings ascending (fr locale)", () => {
    const sorted = sortRows(rows, columns, { key: "name", direction: "asc" });
    expect(sorted.map((r) => r.name)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("sorts strings descending", () => {
    const sorted = sortRows(rows, columns, { key: "name", direction: "desc" });
    expect(sorted.map((r) => r.name)).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("sorts numbers", () => {
    const sorted = sortRows(rows, columns, { key: "age", direction: "asc" });
    expect(sorted.map((r) => r.age)).toEqual([25, 30, 35]);
  });

  it("sorts dates chronologically", () => {
    const sorted = sortRows(rows, columns, { key: "date", direction: "asc" });
    expect(sorted.map((r) => r.id)).toEqual(["1", "3", "2"]);
  });

  it("returns rows unchanged when column has no sortValue", () => {
    const sorted = sortRows(rows, columns, { key: "no-sort", direction: "asc" });
    expect(sorted.map((r) => r.id)).toEqual(["1", "2", "3"]);
  });
});
