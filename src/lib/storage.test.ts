import { beforeEach, describe, expect, it } from "vitest";
import { loadPlan, savePlan } from "./storage";

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("returns an empty plan with the default semester count when nothing is stored", () => {
    expect(loadPlan("wifo", 4)).toEqual({ semesters: 4, modules: {} });
  });

  it("round-trips modules and semester count", () => {
    savePlan("wifo", { semesters: 5, modules: { "CS 500": 1, "CS 530": 0 } });
    expect(loadPlan("wifo", 4)).toEqual({ semesters: 5, modules: { "CS 500": 1, "CS 530": 0 } });
  });

  it("keeps plans for different programs separate", () => {
    savePlan("wifo", { semesters: 4, modules: { "CS 500": 1 } });
    savePlan("mathematik", { semesters: 4, modules: { "MAC 404": 2 } });
    expect(loadPlan("wifo", 4).modules).toEqual({ "CS 500": 1 });
    expect(loadPlan("mathematik", 4).modules).toEqual({ "MAC 404": 2 });
  });

  it("returns an empty plan if stored JSON is corrupt", () => {
    localStorage.setItem("planner:v3:wifo", "{not json");
    expect(loadPlan("wifo", 4)).toEqual({ semesters: 4, modules: {} });
  });

  it("migrates a v2 plan (bare module map) and keeps the default semester count", () => {
    localStorage.setItem("planner:v2:wifo", JSON.stringify({ "CS 500": 2, "CS 530": 0 }));
    expect(loadPlan("wifo", 4)).toEqual({ semesters: 4, modules: { "CS 500": 2, "CS 530": 0 } });
  });

  it("drops module entries whose semester is not a non-negative integer", () => {
    localStorage.setItem(
      "planner:v3:wifo",
      JSON.stringify({ semesters: 4, modules: { "CS 500": 1, "CS 530": "2", "CS 550": -1, "CS 560": 1.5, "IE 500": null } }),
    );
    expect(loadPlan("wifo", 4).modules).toEqual({ "CS 500": 1 });
  });

  it("falls back to the default semester count when the stored value is out of range", () => {
    localStorage.setItem("planner:v3:wifo", JSON.stringify({ semesters: 99, modules: {} }));
    expect(loadPlan("wifo", 4).semesters).toBe(4);
  });

  it("returns an empty plan when the stored value is not an object", () => {
    localStorage.setItem("planner:v3:wifo", JSON.stringify([1, 2]));
    expect(loadPlan("wifo", 4)).toEqual({ semesters: 4, modules: {} });
  });
});
