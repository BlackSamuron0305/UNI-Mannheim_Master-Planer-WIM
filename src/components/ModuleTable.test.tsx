import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModuleTable } from "./ModuleTable";
import type { Module } from "../data/types";

const modules: Module[] = [
  { code: "CS 500", name: "Advanced Software Engineering", ects: 6, examForm: "Klausur 90 min", examType: "long", semester: "HWS", available: true, sourceCatalog: "wifo" },
];

describe("ModuleTable", () => {
  it("lists modules and calls onToggle when a row checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(<ModuleTable modules={modules} plan={{}} onToggle={onToggle} />);
    expect(screen.getByText("Advanced Software Engineering")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("CS 500");
  });

  it("filters by search text", () => {
    render(<ModuleTable modules={modules} plan={{}} onToggle={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "zzz-no-match" } });
    expect(screen.queryByText("Advanced Software Engineering")).not.toBeInTheDocument();
  });
});
