import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SemesterBoard } from "./SemesterBoard";
import type { Module, Plan } from "../data/types";

const modules: Module[] = [
  { code: "CS 500", name: "Advanced Software Engineering", ects: 6, examForm: "", examType: "unknown", semester: "HWS", available: true, sourceCatalog: "wifo" },
];
const plan: Plan = { "CS 500": 1 };

describe("SemesterBoard", () => {
  it("renders a dropzone per semester plus Unassigned, with modules bucketed by their plan semester", () => {
    render(<SemesterBoard modules={modules} plan={plan} semesterCount={2} onAssign={vi.fn()} />);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("Semester 1")).toBeInTheDocument();
    expect(screen.getByText("Semester 2")).toBeInTheDocument();
    expect(screen.getByText("Advanced Software Engineering")).toBeInTheDocument();
  });
});
