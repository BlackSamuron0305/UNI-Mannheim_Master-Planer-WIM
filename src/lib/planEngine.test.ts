import { describe, expect, it } from "vitest";
import { evaluateGroup } from "./planEngine";
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
    expect(result).toEqual({ selectedCount: 0, selectedEcts: 0, status: "incomplete" });
  });

  it("satisfies a minEcts rule once the threshold is reached", () => {
    const group: Group = { id: "g", name: "G", pool: { codes: ["A", "B"] }, rule: { minEcts: 6 } };
    const plan: Plan = { A: 1 };
    const result = evaluateGroup(group, [mod("A", 6), mod("B", 6)], plan);
    expect(result).toEqual({ selectedCount: 1, selectedEcts: 6, status: "satisfied" });
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
