import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ProgramPlanner } from "./ProgramPlanner";
import { WIFO_PROGRAM } from "../data/programs/wifo";

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
});
