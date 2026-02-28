import { describe, it, expect } from "vitest";
import { formatAddress } from "@/lib/utils";

describe("formatAddress", () => {
  it("should format address with default prefix and suffix", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const formatted = formatAddress(address, 6, 4);
    expect(formatted).toBe("0x1234...5678");
  });

  it("should return empty string for empty address", () => {
    const formatted = formatAddress("", 6, 4);
    expect(formatted).toBe("");
  });

  it("should handle different prefix and suffix lengths", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const formatted = formatAddress(address, 4, 6);
    expect(formatted).toBe("0x12...345678");
  });

  it("should handle short addresses", () => {
    const address = "0x1234";
    const formatted = formatAddress(address, 2, 2);
    expect(formatted).toBe("0x...34");
  });
});
