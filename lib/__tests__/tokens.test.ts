import { describe, it, expect } from "vitest";
import {
  TOKEN_REGISTRY,
  TOKENS_BY_SYMBOL,
  TOKENS_BY_ADDRESS,
  getTokenBySymbol,
  getTokenByAddress,
} from "@/lib/tokens";

describe("TOKEN_REGISTRY", () => {
  it("should have exactly 4 tokens", () => {
    expect(TOKEN_REGISTRY).toHaveLength(4);
  });

  it("should have all tokens with 6 decimals", () => {
    TOKEN_REGISTRY.forEach((token) => {
      expect(token.decimals).toBe(6);
    });
  });

  it("should have correct token addresses", () => {
    const expectedAddresses = [
      "0x20c0000000000000000000000000000000000000",
      "0x20c0000000000000000000000000000000000001",
      "0x20c0000000000000000000000000000000000002",
      "0x20c0000000000000000000000000000000000003",
    ];
    TOKEN_REGISTRY.forEach((token, index) => {
      expect(token.address).toBe(expectedAddresses[index]);
    });
  });

  it("should have correct token symbols", () => {
    const expectedSymbols = ["pathUSD", "AlphaUSD", "BetaUSD", "ThetaUSD"];
    TOKEN_REGISTRY.forEach((token, index) => {
      expect(token.symbol).toBe(expectedSymbols[index]);
    });
  });
});

describe("getTokenBySymbol", () => {
  it("should return token by symbol", () => {
    const token = getTokenBySymbol("pathUSD");
    expect(token).toBeDefined();
    expect(token?.symbol).toBe("pathUSD");
    expect(token?.decimals).toBe(6);
  });

  it("should return undefined for unknown symbol", () => {
    const token = getTokenBySymbol("UNKNOWN");
    expect(token).toBeUndefined();
  });
});

describe("getTokenByAddress", () => {
  it("should return token by address (case-insensitive)", () => {
    const token = getTokenByAddress(
      "0x20c0000000000000000000000000000000000000"
    );
    expect(token).toBeDefined();
    expect(token?.symbol).toBe("pathUSD");
  });

  it("should return token by lowercase address", () => {
    const token = getTokenByAddress(
      "0x20c0000000000000000000000000000000000001".toLowerCase()
    );
    expect(token).toBeDefined();
    expect(token?.symbol).toBe("AlphaUSD");
  });
});
