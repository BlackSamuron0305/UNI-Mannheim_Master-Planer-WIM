import { describe, expect, it } from "vitest";
import { evaluateGroup, groupTargetEcts } from "./planEngine";
import type { Group, Module, Plan } from "../data/types";

function mod(code: string, ects: number, tags: string[] = []): Module {
  return {
    code, name: code, ects, examForm: "", examType: "unknown",
    semester: "UNKNOWN", available: true, tags, sourceCatalog: "test",
  };
}

describe("evaluateGroup", () => {
  it("is incomplete with nothing selected", () => {
    const group: Group = { id: "g", name: "G", pool: { codes: ["A"] }, rule: { minEcts: 6 } };
    const result = evaluateGroup(group, [mod("A", 6)], {});
    expect(result).toEqual({ selectedCount: 0, selectedEcts: 0, countedEcts: 0, status: "incomplete" });
  });

  it("satisfies a minEcts rule once the threshold is reached", () => {
    const group: Group = { id: "g", name: "G", pool: { codes: ["A", "B"] }, rule: { minEcts: 6 } };
    const plan: Plan = { A: 1 };
    const result = evaluateGroup(group, [mod("A", 6), mod("B", 6)], plan);
    expect(result).toEqual({ selectedCount: 1, selectedEcts: 6, countedEcts: 6, status: "satisfied" });
  });

  it("flags over when maxEcts is exceeded", () => {
    const group: Group = { id: "g", name: "G", pool: { codes: ["A", "B"] }, rule: { maxEcts: 6 } };
    const plan: Plan = { A: 1, B: 1 };
    const result = evaluateGroup(group, [mod("A", 6), mod("B", 6)], plan);
    expect(result.status).toBe("over");
  });

  it("supports choose-N-of-pool via exact minCount/maxCount", () => {
    const group: Group = {
      id: "fund-cs", name: "Fundamentals CS",
      pool: { codes: ["A", "B", "C"] },
      rule: { minCount: 2, maxCount: 2 },
    };
    const plan: Plan = { A: 1, B: 1 };
    const result = evaluateGroup(group, [mod("A", 6), mod("B", 6), mod("C", 6)], plan);
    expect(result.status).toBe("satisfied");
  });

  it("requires tagRequirements to be met even when minEcts is satisfied", () => {
    const group: Group = {
      id: "apps", name: "Applications",
      pool: { codes: ["A", "B"] },
      rule: { minEcts: 6, tagRequirements: [{ tag: "social-science", minCount: 1 }] },
    };
    const plan: Plan = { A: 1 }; // A has no social-science tag
    const result = evaluateGroup(group, [mod("A", 6), mod("B", 6, ["social-science"])], plan);
    expect(result.status).toBe("on-track");
  });

  it("is on-track between minEcts and maxEcts with a partial selection", () => {
    const group: Group = { id: "g", name: "G", pool: { codes: ["A", "B", "C"] }, rule: { minEcts: 12, maxEcts: 36 } };
    const plan: Plan = { A: 1 };
    const result = evaluateGroup(group, [mod("A", 6), mod("B", 6), mod("C", 6)], plan);
    expect(result.status).toBe("on-track");
  });
});

describe("evaluateGroup caps", () => {
  const group: Group = {
    id: "spec", name: "Spezialisierungskurse",
    pool: { codes: ["M1", "W1", "W2"] },
    rule: { minEcts: 12, caps: [{ sourceCatalog: "wifo", maxEcts: 6 }] },
  };
  const pool: Module[] = [
    { ...mod("M1", 6), sourceCatalog: "mathematik" },
    { ...mod("W1", 6), sourceCatalog: "wifo" },
    { ...mod("W2", 6), sourceCatalog: "wifo" },
  ];

  it("counts at most the capped ECTS from a source catalog toward the rule", () => {
    const result = evaluateGroup(group, pool, { W1: 1, W2: 1 });
    expect(result.selectedEcts).toBe(12);
    expect(result.countedEcts).toBe(6);
    expect(result.status).toBe("on-track");
  });

  it("is satisfied once uncapped modules make up the difference", () => {
    const result = evaluateGroup(group, pool, { M1: 1, W1: 1, W2: 1 });
    expect(result.selectedEcts).toBe(18);
    expect(result.countedEcts).toBe(12);
    expect(result.status).toBe("satisfied");
  });

  it("caps by tag as well as by source catalog", () => {
    const tagGroup: Group = {
      id: "g", name: "G", pool: { codes: ["A", "B", "C"] },
      rule: { minEcts: 12, caps: [{ tag: "external", maxEcts: 6 }] },
    };
    const tagPool = [mod("A", 6), mod("B", 6, ["external"]), mod("C", 6, ["external"])];
    const result = evaluateGroup(tagGroup, tagPool, { B: 1, C: 1 });
    expect(result.countedEcts).toBe(6);
    expect(result.status).toBe("on-track");
  });
});

describe("groupTargetEcts", () => {
  const pool = [mod("A", 6), mod("B", 6), mod("C", 6)];
  const withRule = (rule: Group["rule"]): Group => ({ id: "g", name: "G", pool: { codes: ["A", "B", "C"] }, rule });

  it("uses exactEcts when present", () => {
    expect(groupTargetEcts(withRule({ exactEcts: 18, minEcts: 6 }), pool)).toBe(18);
  });

  it("falls back to minEcts", () => {
    expect(groupTargetEcts(withRule({ minEcts: 36 }), pool)).toBe(36);
  });

  it("derives a count-based target when every module in the pool has the same ECTS", () => {
    expect(groupTargetEcts(withRule({ minCount: 3, maxCount: 3 }), pool)).toBe(18);
  });

  it("has no target for a count-based rule over a mixed-ECTS pool", () => {
    expect(groupTargetEcts(withRule({ minCount: 2 }), [mod("A", 6), mod("B", 4)])).toBeUndefined();
  });

  it("falls back to maxEcts when no minimum is defined", () => {
    expect(groupTargetEcts(withRule({ maxEcts: 12 }), pool)).toBe(12);
  });

  it("has no target when the rule has no ECTS or count constraint", () => {
    expect(groupTargetEcts(withRule({}), pool)).toBeUndefined();
  });
});
