export interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  faucetAmount: string;
}

export interface TokenBalance {
  token: TokenInfo;
  balance: bigint;
  formatted: string;
}

export interface TokenPair {
  fromToken: TokenInfo;
  toToken: TokenInfo;
}

export interface UseTokenBalancesReturn {
  balances: TokenBalance[];
  isLoading: boolean;
  error?: Error;
  refetch: () => Promise<void>;
}
