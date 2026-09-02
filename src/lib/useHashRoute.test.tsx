import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useHashRoute } from "./useHashRoute";

describe("useHashRoute", () => {
  afterEach(() => { window.location.hash = ""; });

  it("returns an empty route id for the picker", () => {
    window.location.hash = "";
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("");
  });

  it("returns the program id from the hash", () => {
    window.location.hash = "#/wifo";
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("wifo");
  });

  it("updates when the hash changes", () => {
    window.location.hash = "";
    const { result } = renderHook(() => useHashRoute());
    act(() => {
      window.location.hash = "#/wifo";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(result.current).toBe("wifo");
  });
});
