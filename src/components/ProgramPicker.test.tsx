import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramPicker } from "./ProgramPicker";
import type { Program } from "../data/types";

const programs: Program[] = [
  { id: "wifo", name: "M.Sc. Business Informatics", shortName: "Wifo", totalEctsRange: [120, 120], semesters: 4, thesisEcts: 30, thesisGateEcts: 60, groups: [] },
];

describe("ProgramPicker", () => {
  it("renders a card per program and navigates on click", () => {
    render(<ProgramPicker programs={programs} />);
    const card = screen.getByText("M.Sc. Business Informatics");
    fireEvent.click(card);
    expect(window.location.hash).toBe("#/wifo");
  });
});
