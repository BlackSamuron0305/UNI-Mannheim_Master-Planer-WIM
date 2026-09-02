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
