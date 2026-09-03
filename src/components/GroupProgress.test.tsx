import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GroupProgress } from "./GroupProgress";
import type { Group, Module } from "../data/types";

const group: Group = { id: "g", name: "Fundamentals CS", pool: { codes: ["A", "B"] }, rule: { minEcts: 12 } };
const modules: Module[] = [
  { code: "A", name: "A", ects: 6, examForm: "", examType: "unknown", semester: "UNKNOWN", available: true, sourceCatalog: "t" },
  { code: "B", name: "B", ects: 6, examForm: "", examType: "unknown", semester: "UNKNOWN", available: true, sourceCatalog: "t" },
];

describe("GroupProgress", () => {
  it("shows the group name and satisfied status once the target is met", () => {
    render(<GroupProgress group={group} poolModules={modules} plan={{ A: 1, B: 1 }} />);
    expect(screen.getByText("Fundamentals CS")).toBeInTheDocument();
    expect(screen.getByText(/satisfied/i)).toBeInTheDocument();
  });
});

describe("GroupProgress count-based target", () => {
  it("derives the ECTS target for a count-based rule over a uniform pool", () => {
    const countGroup: Group = { id: "cs", name: "Fundamentals CS", pool: { codes: ["A", "B", "C"] }, rule: { minCount: 3, maxCount: 3 } };
    const three: Module[] = [...modules, { ...modules[0], code: "C", name: "C" }];
    render(<GroupProgress group={countGroup} poolModules={three} plan={{ A: 1 }} />);
    expect(screen.getByText(/6 \/ 18 ECTS/)).toBeInTheDocument();
  });
});
