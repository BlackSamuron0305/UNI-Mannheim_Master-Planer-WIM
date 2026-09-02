import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the program picker at the root route", () => {
    window.location.hash = "";
    render(<App />);
    expect(screen.getByText("WIM Master Planner")).toBeInTheDocument();
  });
});
