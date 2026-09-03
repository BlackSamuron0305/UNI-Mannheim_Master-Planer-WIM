import { describe, expect, it } from "vitest";
import { buildRegistry, resolveGroupPools, resolvePool } from "./registry";
import type { Module, Program } from "./types";

function mod(code: string, sourceCatalog: string): Module {
  return { code, name: code, ects: 6, examForm: "", examType: "unknown", semester: "UNKNOWN", available: true, sourceCatalog };
}

describe("buildRegistry", () => {
  it("indexes modules by code across catalogs", () => {
    const registry = buildRegistry({ a: [mod("X", "a")], b: [mod("Y", "b")] });
    expect(registry.get("X")?.sourceCatalog).toBe("a");
    expect(registry.get("Y")?.sourceCatalog).toBe("b");
  });

  it("throws on a duplicate code across catalogs", () => {
    expect(() => buildRegistry({ a: [mod("X", "a")], b: [mod("X", "b")] })).toThrow(/Duplicate module code "X"/);
  });
});

describe("resolvePool", () => {
  const catalogs = { wifo: [mod("CS 500", "wifo"), mod("CS 530", "wifo")] };

  it("resolves an explicit code list", () => {
    const result = resolvePool({ codes: ["CS 500"] }, catalogs);
    expect(result.map((m) => m.code)).toEqual(["CS 500"]);
  });

  it("resolves a whole source catalog", () => {
    const result = resolvePool({ sourceCatalog: "wifo" }, catalogs);
    expect(result.map((m) => m.code)).toEqual(["CS 500", "CS 530"]);
  });

  it("throws for an unknown code", () => {
    expect(() => resolvePool({ codes: ["NOPE"] }, catalogs)).toThrow(/Unknown module code "NOPE"/);
  });

  it("throws for an unknown source catalog", () => {
    expect(() => resolvePool({ sourceCatalog: "nope" }, catalogs)).toThrow(/Unknown source catalog "nope"/);
  });

  it("throws on duplicate codes when resolving code list", () => {
    const catalogsWithDuplicates = { a: [mod("X", "a")], b: [mod("X", "b")] };
    expect(() => resolvePool({ codes: ["X"] }, catalogsWithDuplicates)).toThrow(/Duplicate module code "X"/);
  });

  it("returns a copy of the source catalog, not the shared reference", () => {
    const sourceArray = [mod("CS 500", "wifo"), mod("CS 530", "wifo")];
    const catalogsWithArray = { wifo: sourceArray };
    const result = resolvePool({ sourceCatalog: "wifo" }, catalogsWithArray);
    expect(result).toEqual(sourceArray);
    expect(result).not.toBe(sourceArray);
  });

  it("omits exactly the excluded codes from a source catalog, keeping everything else", () => {
    const catalogsWithThree = {
      wifo: [mod("CS 500", "wifo"), mod("CS 530", "wifo"), mod("CS 550", "wifo")],
    };
    const result = resolvePool({ sourceCatalog: "wifo", excludeCodes: ["CS 530"] }, catalogsWithThree);
    expect(result.map((m) => m.code)).toEqual(["CS 500", "CS 550"]);
  });
});

describe("buildRegistry catalog-key guard", () => {
  it("throws when a module's sourceCatalog does not match the key it is filed under", () => {
    expect(() => buildRegistry({ wifo: [mod("CS 500", "businessSchool")] })).toThrow(
      /sourceCatalog "businessSchool".*filed under "wifo"/,
    );
  });
});

describe("resolveGroupPools", () => {
  const catalogs = {
    wifo: [mod("CS 500", "wifo"), mod("CS 530", "wifo")],
    bs: [mod("ACC 510", "bs")],
  };
  const program: Program = {
    id: "p", name: "P", shortName: "P", totalEctsRange: [120, 120], semesters: 4, thesisEcts: 30, thesisGateEcts: 60,
    groups: [
      { id: "a", name: "A", pool: { codes: ["CS 530"] }, rule: {} },
      { id: "b", name: "B", pool: { sourceCatalog: "bs" }, rule: {} },
    ],
  };

  it("resolves every group's pool, keyed by group id", () => {
    const pools = resolveGroupPools(program, catalogs);
    expect([...pools.keys()]).toEqual(["a", "b"]);
    expect(pools.get("a")!.map((m) => m.code)).toEqual(["CS 530"]);
    expect(pools.get("b")!.map((m) => m.code)).toEqual(["ACC 510"]);
  });
});
