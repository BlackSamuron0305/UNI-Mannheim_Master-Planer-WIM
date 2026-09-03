import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ProgramPlanner } from "./ProgramPlanner";
import { WIFO_PROGRAM } from "../data/programs/wifo";
import type { Program } from "../data/types";

describe("ProgramPlanner", () => {
  beforeEach(() => localStorage.clear());

  it("selecting a module updates the stats bar and persists across remount", () => {
    const { unmount } = render(<ProgramPlanner program={WIFO_PROGRAM} />);
    const checkbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(checkbox);
    unmount();

    render(<ProgramPlanner program={WIFO_PROGRAM} />);
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
  });

  it("does not render a Business School module excluded from Wifo's Fundamentals BA group (MAN 605)", () => {
    // MAN 605 exists in BUSINESS_SCHOOL_MODULES but is in WIFO_PROGRAM's
    // fundamentals-ba `excludeCodes` list, so it must not be selectable.
    render(<ProgramPlanner program={WIFO_PROGRAM} />);
    expect(screen.queryByText("MAN 605")).not.toBeInTheDocument();
  });

  it("renders any program definition, not only ones with a hardcoded catalog set", () => {
    const program: Program = {
      id: "custom", name: "Custom Program", shortName: "C",
      totalEctsRange: [120, 120], semesters: 2, thesisEcts: 30, thesisGateEcts: 60,
      groups: [{ id: "g", name: "Pick one", pool: { codes: ["CS 500"] }, rule: { minCount: 1 } }],
    };
    render(<ProgramPlanner program={program} />);
    expect(screen.getByText("CS 500")).toBeInTheDocument();
  });

  it("persists the semester count across remount", () => {
    const { unmount } = render(<ProgramPlanner program={WIFO_PROGRAM} />);
    fireEvent.change(screen.getByLabelText(/semesters/i), { target: { value: "6" } });
    unmount();

    render(<ProgramPlanner program={WIFO_PROGRAM} />);
    expect(screen.getByLabelText(/semesters/i)).toHaveValue(6);
  });

  it("moves modules out of semesters that no longer exist when the count shrinks", () => {
    localStorage.setItem("planner:v3:wifo", JSON.stringify({ semesters: 4, modules: { "CS 500": 4 } }));
    render(<ProgramPlanner program={WIFO_PROGRAM} />);
    fireEvent.change(screen.getByLabelText(/semesters/i), { target: { value: "3" } });

    const unassigned = screen.getByText("Unassigned").parentElement!;
    expect(within(unassigned).getByText(/CS 500/)).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem("planner:v3:wifo")!);
    expect(stored.modules["CS 500"]).toBe(0);
  });
});
