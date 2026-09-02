import { describe, expect, it } from "vitest";
import { buildRegistry, resolvePool } from "./registry";
import type { Module } from "./types";

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
});
