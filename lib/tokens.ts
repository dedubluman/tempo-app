import type { TokenInfo } from "@/types/token";

export const TOKEN_REGISTRY: TokenInfo[] = [
  {
    address: "0x20c0000000000000000000000000000000000000",
    name: "Path USD",
    symbol: "pathUSD",
    decimals: 6,
    faucetAmount: "1000",
  },
  {
    address: "0x20c0000000000000000000000000000000000001",
    name: "Alpha USD",
    symbol: "AlphaUSD",
    decimals: 6,
    faucetAmount: "1000",
  },
  {
    address: "0x20c0000000000000000000000000000000000002",
    name: "Beta USD",
    symbol: "BetaUSD",
    decimals: 6,
    faucetAmount: "1000",
  },
  {
    address: "0x20c0000000000000000000000000000000000003",
    name: "Theta USD",
    symbol: "ThetaUSD",
    decimals: 6,
    faucetAmount: "1000",
  },
];

export const TOKENS_BY_SYMBOL: Record<string, TokenInfo> = Object.fromEntries(
  TOKEN_REGISTRY.map((token) => [token.symbol, token]),
);

export const TOKENS_BY_ADDRESS: Record<string, TokenInfo> = Object.fromEntries(
  TOKEN_REGISTRY.map((token) => [token.address.toLowerCase(), token]),
);

export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return TOKENS_BY_SYMBOL[symbol];
}

export function getTokenByAddress(address: string): TokenInfo | undefined {
  return TOKENS_BY_ADDRESS[address.toLowerCase()];
}
