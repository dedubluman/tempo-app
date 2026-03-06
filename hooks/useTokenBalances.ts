"use client";

import { useBalanceStore, useCustomTokenStore } from "@/lib/store";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAccount, usePublicClient } from "wagmi";
import {
  decodeFunctionResult,
  encodeFunctionData,
  formatUnits,
  getAddress,
  isAddress,
} from "viem";
import type { Address } from "viem";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { multicall3Abi, pathUsdAbi } from "@/lib/abi";
import { MULTICALL3_ADDRESS } from "@/lib/constants";
import type {
  TokenBalance,
  TokenInfo,
  UseTokenBalancesReturn,
} from "@/types/token";

const E2E_MOCK_AUTH = process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === "1";

export function useTokenBalances(): UseTokenBalancesReturn {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // E2E mock auth fallback
  const mockAddress =
    E2E_MOCK_AUTH &&
    typeof window !== "undefined" &&
    window.localStorage.getItem("tempo.walletCreated") === "1"
      ? window.localStorage.getItem("tempo.lastAddress") || ""
      : "";
  const normalizedMockAddress = isAddress(mockAddress.toLowerCase())
    ? getAddress(mockAddress.toLowerCase())
    : undefined;

  const normalizedAddress =
    address && isAddress(address) ? getAddress(address) : undefined;
  const effectiveAddress: Address | undefined =
    normalizedAddress ?? (E2E_MOCK_AUTH ? normalizedMockAddress : undefined);
  const customTokens = useCustomTokenStore((state) => state.customTokens);

  // Use Zustand store for balances
  const { balances, isLoading, error } = useBalanceStore();
  const setBalances = useBalanceStore((state) => state.setBalances);
  const setIsLoading = useBalanceStore((state) => state.setIsLoading);
  const setError = useBalanceStore((state) => state.setError);
  const markFetched = useBalanceStore((state) => state.markFetched);
  const previousAddressRef = useRef<Address | undefined>(undefined);

  const tokenList = useMemo<TokenInfo[]>(() => {
    const seen = new Set<string>();
    const merged: TokenInfo[] = [];

    for (const token of TOKEN_REGISTRY) {
      seen.add(token.address.toLowerCase());
      merged.push(token);
    }

    for (const token of customTokens) {
      const key = token.address.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        faucetAmount: "0",
      });
    }

    return merged;
  }, [customTokens]);

  useEffect(() => {
    if (previousAddressRef.current === effectiveAddress) {
      return;
    }

    previousAddressRef.current = effectiveAddress;
    setBalances([]);
    setError(null);
  }, [effectiveAddress, setBalances, setError]);

  const fetchBalances = useCallback(async () => {
    if (!effectiveAddress || !publicClient) {
      setBalances([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const calls = tokenList.map((token) => ({
        target: token.address,
        allowFailure: true,
        callData: encodeFunctionData({
          abi: pathUsdAbi,
          functionName: "balanceOf",
          args: [effectiveAddress],
        }),
      }));

      const results = (await publicClient.readContract({
        address: MULTICALL3_ADDRESS,
        abi: multicall3Abi,
        functionName: "aggregate3",
        args: [calls],
      })) as readonly { success: boolean; returnData: `0x${string}` }[];

      const newBalances: TokenBalance[] = tokenList.map((token, index) => {
        const result = results[index];
        const balance =
          result?.success && result.returnData
            ? (decodeFunctionResult({
                abi: pathUsdAbi,
                functionName: "balanceOf",
                data: result.returnData,
              }) as bigint)
            : BigInt(0);

        return {
          token,
          balance,
          formatted: formatUnits(balance, token.decimals),
        };
      });

      setBalances(newBalances);
      markFetched();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch balances");
      setBalances([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    effectiveAddress,
    markFetched,
    publicClient,
    setBalances,
    setError,
    setIsLoading,
    tokenList,
  ]);

  // Fetch on mount and when address changes
  useEffect(() => {
    void fetchBalances();
  }, [fetchBalances]);

  return {
    balances,
    isLoading,
    error: error ? new Error(error) : undefined,
    refetch: fetchBalances,
  };
}
