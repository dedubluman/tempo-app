"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { decodeFunctionResult, encodeFunctionData, formatUnits, getAddress, isAddress } from "viem";
import type { Address } from "viem";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { multicall3Abi, pathUsdAbi } from "@/lib/abi";
import { MULTICALL3_ADDRESS } from "@/lib/constants";
import type { TokenBalance, UseTokenBalancesReturn } from "@/types/token";

const E2E_MOCK_AUTH = process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === "1";

export function useTokenBalances(): UseTokenBalancesReturn {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // E2E mock auth fallback
  const mockAddress =
    E2E_MOCK_AUTH && typeof window !== "undefined" && window.localStorage.getItem("tempo.walletCreated") === "1"
      ? window.localStorage.getItem("tempo.lastAddress") || ""
      : "";
  const normalizedMockAddress = isAddress(mockAddress.toLowerCase()) ? getAddress(mockAddress.toLowerCase()) : undefined;

  const normalizedAddress = address && isAddress(address) ? getAddress(address) : undefined;
  const effectiveAddress: Address | undefined = normalizedAddress ?? (E2E_MOCK_AUTH ? normalizedMockAddress : undefined);

  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  const fetchBalances = useCallback(async () => {
    if (!effectiveAddress || !publicClient) {
      setBalances([]);
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const calls = TOKEN_REGISTRY.map((token) => ({
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

      const newBalances: TokenBalance[] = TOKEN_REGISTRY.map((token, index) => {
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
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch balances"));
      setBalances([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveAddress, publicClient]);

  // Fetch on mount and when address changes
  useEffect(() => {
    void fetchBalances();
  }, [fetchBalances]);

  return {
    balances,
    isLoading,
    error,
    refetch: fetchBalances,
  };
}
