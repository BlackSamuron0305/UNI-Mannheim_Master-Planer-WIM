import { describe, expect, it } from "vitest";
import { BUSINESS_SCHOOL_MODULES } from "./businessSchool";

describe("BUSINESS_SCHOOL_MODULES", () => {
  it("has a plausible module count for the current catalog", () => {
    expect(BUSINESS_SCHOOL_MODULES.length).toBeGreaterThan(70);
    expect(BUSINESS_SCHOOL_MODULES.length).toBeLessThan(120);
  });

  it("every module has sourceCatalog businessSchool and a positive ECTS value", () => {
    for (const m of BUSINESS_SCHOOL_MODULES) {
      expect(m.sourceCatalog).toBe("businessSchool");
      expect(m.ects).toBeGreaterThan(0);
    }
  });

  it("has no duplicate codes", () => {
    const codes = BUSINESS_SCHOOL_MODULES.map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("contains known anchor modules with correct ECTS", () => {
    const byCode = new Map(BUSINESS_SCHOOL_MODULES.map((m) => [m.code, m]));
    expect(byCode.get("ACC 510")?.ects).toBe(8);
    // PDF (academic year 2026/2027 edition) states 5 ECTS for FIN 500, not 6 as in
    // the brief's illustrative example — verified against the "ECTS credits" field
    // on the FIN 500 module description page.
    expect(byCode.get("FIN 500")?.ects).toBe(5);
  });
});
