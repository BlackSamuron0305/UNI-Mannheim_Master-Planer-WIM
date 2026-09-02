import { describe, expect, it } from "vitest";
import { WIFO_PROGRAM } from "./wifo";
import { WIFO_MODULES } from "../catalog/wifo";
import { BUSINESS_SCHOOL_MODULES } from "../catalog/businessSchool";
import { buildRegistry, resolvePool } from "../registry";
import { evaluateGroup } from "../../lib/planEngine";
import type { Group } from "../types";

const catalogs = { wifo: WIFO_MODULES, businessSchool: BUSINESS_SCHOOL_MODULES };

describe("WIFO_PROGRAM", () => {
  it("builds a registry without duplicate-code errors", () => {
    expect(() => buildRegistry(catalogs)).not.toThrow();
  });

  it("has a Fundamentals Computer Science pool of exactly 7 modules at 6 ECTS each", () => {
    const group = WIFO_PROGRAM.groups.find((g) => g.id === "fundamentals-cs")!;
    const pool = resolvePool(group.pool, catalogs);
    expect(pool).toHaveLength(7);
    expect(pool.every((m) => m.ects === 6)).toBe(true);
  });

  it("resolves Fundamentals Business Administration to the Business School pool minus Wifo's 14 excluded MAN/MKT codes", () => {
    const group = WIFO_PROGRAM.groups.find((g) => g.id === "fundamentals-ba")!;
    const pool = resolvePool(group.pool, catalogs);
    expect(pool.length).toBe(BUSINESS_SCHOOL_MODULES.length - 14);
    expect(pool.length).toBe(104);
    const excluded = [
      "MAN 605", "MAN 608", "MAN 646", "MAN 647", "MAN 648", "MAN 654", "MAN 655", "MAN 656", "MAN 699",
      "MKT 575", "MKT 580", "MKT 622", "MKT 623", "MKT 625",
    ];
    const codes = new Set(pool.map((m) => m.code));
    for (const code of excluded) {
      expect(codes.has(code)).toBe(false);
    }
  });

  it("marks Fundamentals CS satisfied once exactly 3 modules are selected", () => {
    const group = WIFO_PROGRAM.groups.find((g) => g.id === "fundamentals-cs")!;
    const pool = resolvePool(group.pool, catalogs);
    const plan = Object.fromEntries(pool.slice(0, 3).map((m) => [m.code, 1]));
    expect(evaluateGroup(group, pool, plan).status).toBe("satisfied");
  });

  it("has a non-empty Specialization pool combining CS/IE/IS-Courses and Further modules", () => {
    const group = WIFO_PROGRAM.groups.find((g) => g.id === "specialization")!;
    const pool = resolvePool(group.pool, catalogs);
    expect(pool.length).toBeGreaterThan(30);
    // IS-Courses must have been folded in (previously missing data).
    expect(pool.some((m) => m.code === "IS 661")).toBe(true);
  });

  it("marks Projects and Seminars satisfied at exactly 18 ECTS (Team Project + Scientific Research + one Seminar)", () => {
    const group = WIFO_PROGRAM.groups.find((g) => g.id === "projects-seminars")!;
    const pool = resolvePool(group.pool, catalogs);
    const seminar = pool.find((m) => m.code === "CS 701")!;
    const plan = { "TP 500": 1, "SQ 500": 1, [seminar.code]: 1 };
    const evaluation = evaluateGroup(group, pool, plan);
    expect(evaluation.selectedEcts).toBe(18);
    expect(evaluation.status).toBe("satisfied");
  });

  it("does NOT mark Projects and Seminars satisfied at 18 ECTS without a Team Project", () => {
    const group = WIFO_PROGRAM.groups.find((g) => g.id === "projects-seminars")!;
    const pool = resolvePool(group.pool, catalogs);
    // Four 4-ECTS seminars + Scientific Research (2 ECTS) = 18 ECTS, but no TP 500.
    const seminars = pool.filter((m) => m.tags?.includes("seminar")).slice(0, 4);
    const plan = Object.fromEntries([...seminars.map((m) => [m.code, 1]), ["SQ 500", 1]]);
    const evaluation = evaluateGroup(group, pool, plan);
    expect(evaluation.selectedEcts).toBe(18);
    expect(evaluation.status).toBe("on-track");
  });

  it("resolves the Master's Thesis group to exactly 1 module worth 30 ECTS", () => {
    const group = WIFO_PROGRAM.groups.find((g) => g.id === "thesis")!;
    expect(group).toBeDefined();
    const pool = resolvePool(group.pool, catalogs);
    expect(pool).toHaveLength(1);
    expect(pool[0].code).toBe("MA 650");
    expect(pool[0].ects).toBe(30);

    const plan = { "MA 650": 1 };
    expect(evaluateGroup(group, pool, plan).status).toBe("satisfied");
  });

  it("sums the 5 groups' ECTS targets to the program's total ECTS (120)", () => {
    // Every group's target is its exactEcts/minEcts rule value, except
    // Fundamentals CS, which is a fixed-count pick (minCount 3 of a
    // pool that's uniformly 6 ECTS per module) rather than an ECTS rule.
    const targetEctsOf = (group: Group): number => {
      const { exactEcts, minEcts, minCount } = group.rule;
      if (exactEcts !== undefined) return exactEcts;
      if (minEcts !== undefined) return minEcts;
      if (minCount !== undefined) {
        const pool = resolvePool(group.pool, catalogs);
        expect(pool.every((m) => m.ects === pool[0].ects)).toBe(true);
        return minCount * pool[0].ects;
      }
      throw new Error(`Group "${group.id}" has no ECTS target defined`);
    };

    const total = WIFO_PROGRAM.groups.reduce((sum, g) => sum + targetEctsOf(g), 0);
    expect(total).toBe(WIFO_PROGRAM.totalEctsRange[0]);
    expect(total).toBe(120);
  });
});
