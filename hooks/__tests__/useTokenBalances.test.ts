import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockSetBalances = vi.fn();
const mockSetIsLoading = vi.fn();
const mockSetError = vi.fn();
const mockMarkFetched = vi.fn();
const mockReadContract = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({ address: undefined })),
  usePublicClient: vi.fn(() => ({
    readContract: mockReadContract,
  })),
}));

vi.mock("@/lib/store", () => ({
  useBalanceStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      balances: [],
      isLoading: false,
      error: null,
      setBalances: mockSetBalances,
      setIsLoading: mockSetIsLoading,
      setError: mockSetError,
      markFetched: mockMarkFetched,
    };
    return selector ? selector(state) : state;
  }),
  useCustomTokenStore: vi.fn((selector: (s: unknown) => unknown) =>
    selector({ customTokens: [] }),
  ),
}));

vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    isAddress: vi.fn(() => true),
    getAddress: vi.fn((addr: string) => addr),
    encodeFunctionData: vi.fn(() => "0x"),
    decodeFunctionResult: vi.fn(() => BigInt(1_000_000)),
    formatUnits: vi.fn(() => "1.00"),
  };
});

vi.mock("@/lib/tokens", () => ({
  TOKEN_REGISTRY: [
    {
      address: "0x20c0000000000000000000000000000000000000",
      symbol: "pathUSD",
      name: "pathUSD",
      decimals: 6,
      faucetAmount: "10",
    },
  ],
}));

vi.mock("@/lib/abi", () => ({
  multicall3Abi: [],
  pathUsdAbi: [],
}));

vi.mock("@/lib/constants", () => ({
  MULTICALL3_ADDRESS: "0xcA11bde05977b3631167028862bE2a173976CA11",
}));

import { useAccount, usePublicClient } from "wagmi";
import { useTokenBalances } from "@/hooks/useTokenBalances";

describe("useTokenBalances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContract.mockResolvedValue([{ success: true, returnData: "0x00" }]);
    vi.mocked(useAccount).mockReturnValue({ address: undefined } as ReturnType<
      typeof useAccount
    >);
    vi.mocked(usePublicClient).mockReturnValue({
      readContract: mockReadContract,
    } as unknown as ReturnType<typeof usePublicClient>);
  });

  it("returns empty balances when no address connected", async () => {
    const { result } = renderHook(() => useTokenBalances());
    await waitFor(() => {
      expect(mockSetBalances).toHaveBeenCalledWith([]);
    });
    expect(result.current.balances).toEqual([]);
  });

  it("returns refetch function", () => {
    const { result } = renderHook(() => useTokenBalances());
    expect(typeof result.current.refetch).toBe("function");
  });

  it("calls readContract when address is available", async () => {
    vi.mocked(useAccount).mockReturnValue({
      address: "0xabc123",
    } as unknown as ReturnType<typeof useAccount>);

    renderHook(() => useTokenBalances());

    await waitFor(() => {
      expect(mockReadContract).toHaveBeenCalled();
    });
  });

  it("calls setIsLoading(true) before fetching", async () => {
    vi.mocked(useAccount).mockReturnValue({
      address: "0xabc123",
    } as unknown as ReturnType<typeof useAccount>);

    renderHook(() => useTokenBalances());

    await waitFor(() => {
      expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    });
  });

  it("handles readContract error gracefully", async () => {
    vi.mocked(useAccount).mockReturnValue({
      address: "0xabc123",
    } as unknown as ReturnType<typeof useAccount>);
    mockReadContract.mockRejectedValue(new Error("RPC error"));

    renderHook(() => useTokenBalances());

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("RPC error");
      expect(mockSetBalances).toHaveBeenCalledWith([]);
    });
  });

  it("returns isLoading state", () => {
    const { result } = renderHook(() => useTokenBalances());
    expect(typeof result.current.isLoading).toBe("boolean");
  });
});
