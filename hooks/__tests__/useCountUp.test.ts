import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "@testing-library/react";

vi.mock("framer-motion", () => ({
  useInView: vi.fn(() => false),
  useReducedMotion: vi.fn(() => false),
}));

import { useInView, useReducedMotion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";

describe("useCountUp", () => {
  let rafCallback: ((time: number) => void) | null = null;
  
  beforeEach(() => {
    rafCallback = null;
    vi.stubGlobal("requestAnimationFrame", vi.fn((cb: (time: number) => void) => {
      rafCallback = cb;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("performance", { now: () => 0 });
    vi.mocked(useInView).mockReturnValue(false);
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns raw value as displayValue on initial render", () => {
    const { result } = renderHook(() => useCountUp({ raw: "$42.50" }));
    expect(result.current.displayValue).toBe("$42.50");
  });

  it("returns ref object", () => {
    const { result } = renderHook(() => useCountUp({ raw: "100" }));
    expect(result.current.ref).toBeDefined();
    expect(result.current.ref.current).toBeNull();
  });

  it("does not animate when prefersReducedMotion is true", () => {
    vi.mocked(useInView).mockReturnValue(true);
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { result } = renderHook(() => useCountUp({ raw: "100" }));
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(result.current.displayValue).toBe("100");
  });

  it("does not animate when value is 0", () => {
    vi.mocked(useInView).mockReturnValue(true);
    vi.mocked(useReducedMotion).mockReturnValue(false);
    const { result } = renderHook(() => useCountUp({ raw: "0" }));
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(result.current.displayValue).toBe("0");
  });

  it("triggers requestAnimationFrame when in view with non-zero value", () => {
    vi.mocked(useInView).mockReturnValue(true);
    vi.mocked(useReducedMotion).mockReturnValue(false);
    renderHook(() => useCountUp({ raw: "100" }));
    expect(requestAnimationFrame).toHaveBeenCalled();
  });

  it("completes animation to target value", () => {
    vi.mocked(useInView).mockReturnValue(true);
    vi.mocked(useReducedMotion).mockReturnValue(false);
    const { result } = renderHook(() => useCountUp({ raw: "100", duration: 1 }));
    
    act(() => {
      // Fire RAF callback with time well past duration (2000ms > 1000ms duration)
      if (rafCallback) rafCallback(2000);
    });
    
    expect(result.current.displayValue).toBe("100");
  });
});
