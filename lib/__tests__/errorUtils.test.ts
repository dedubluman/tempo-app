import { describe, it, expect } from "vitest";
import { prettyError } from "@/lib/errorUtils";

describe("prettyError", () => {
  it("returns passkey message for user rejected errors", () => {
    expect(prettyError(new Error("User rejected the request"))).toBe(
      "Action cancelled in passkey confirmation."
    );
  });

  it("returns passkey message for user denied errors", () => {
    expect(prettyError(new Error("user denied action"))).toBe(
      "Action cancelled in passkey confirmation."
    );
  });

  it("returns balance message for insufficient funds", () => {
    expect(prettyError(new Error("Insufficient balance for transfer"))).toBe(
      "Insufficient balance or session key limit reached."
    );
  });

  it("returns balance message for sponsor errors", () => {
    expect(prettyError(new Error("Fee sponsor limit exceeded"))).toBe(
      "Insufficient balance or session key limit reached."
    );
  });

  it("returns network message for timeout", () => {
    expect(prettyError(new Error("Request timeout after 30s"))).toBe(
      "Network is slow. Please try again."
    );
  });

  it("returns network message for RPC errors", () => {
    expect(prettyError(new Error("RPC connection failed"))).toBe(
      "Network is slow. Please try again."
    );
  });

  it("returns first line of unknown errors", () => {
    expect(prettyError(new Error("Custom error\nSecond line"))).toBe("Custom error");
  });

  it("handles non-Error objects", () => {
    expect(prettyError("string error")).toBe("string error");
  });

  it("returns fallback for empty errors", () => {
    expect(prettyError(new Error(""))).toBe("Something went wrong");
  });
});
