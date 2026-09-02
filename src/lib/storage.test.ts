import { beforeEach, describe, expect, it } from "vitest";
import { loadPlan, savePlan } from "./storage";

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("returns an empty plan when nothing is stored", () => {
    expect(loadPlan("wifo")).toEqual({});
  });

  it("round-trips a saved plan", () => {
    savePlan("wifo", { "CS 500": 1, "CS 530": 0 });
    expect(loadPlan("wifo")).toEqual({ "CS 500": 1, "CS 530": 0 });
  });

  it("keeps plans for different programs separate", () => {
    savePlan("wifo", { "CS 500": 1 });
    savePlan("mathematik", { "MAC 404": 2 });
    expect(loadPlan("wifo")).toEqual({ "CS 500": 1 });
    expect(loadPlan("mathematik")).toEqual({ "MAC 404": 2 });
  });

  it("returns an empty plan if stored JSON is corrupt", () => {
    localStorage.setItem("planner:v2:wifo", "{not json");
    expect(loadPlan("wifo")).toEqual({});
  });
});
