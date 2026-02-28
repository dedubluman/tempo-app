import { describe, it, expect } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("should merge class names correctly", () => {
    const result = cn("px-2", "py-1");
    expect(result).toBe("px-2 py-1");
  });

  it("should handle conditional classes", () => {
    const result = cn("px-2", false && "py-1", "text-sm");
    expect(result).toBe("px-2 text-sm");
  });

  it("should merge tailwind classes with proper precedence", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("should handle empty inputs", () => {
    const result = cn("", "px-2");
    expect(result).toBe("px-2");
  });

  it("should handle undefined and null values", () => {
    const result = cn("px-2", undefined, null, "py-1");
    expect(result).toBe("px-2 py-1");
  });
});
