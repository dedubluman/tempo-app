"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowsClockwise, ArrowsDownUp, CheckCircle, Copy, TrendUp } from "@phosphor-icons/react";
import { useBlockNumber, useSendCallsSync } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { Actions } from "viem/tempo";
import { formatUnits, parseUnits } from "viem";
import { AmountInput } from "@/components/ui/AmountInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TokenSelector } from "@/components/ui/TokenSelector";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { EXPLORER_URL, STABLECOIN_DEX_ADDRESS } from "@/lib/constants";
import { dismissToast, showError, showLoading, showSuccess } from "@/lib/toast";

const SLIPPAGE_BPS = BigInt(50);
const BPS_DENOMINATOR = BigInt(10_000);

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function prettyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected")) {
    return "Swap cancelled in passkey confirmation.";
  }
  if (lower.includes("insufficientliquidity") || lower.includes("liquidity")) {
    return "Insufficient liquidity for this pair and amount.";
  }
  if (lower.includes("insufficient") || lower.includes("sponsor") || lower.includes("fee")) {
    return "Insufficient balance or fee sponsorship issue. Try a smaller amount.";
  }
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("rpc")) {
    return "Network is slow. Please retry in a moment.";
  }

  return message.split("\n")[0] || "Swap failed";
}

export default function SwapPage() {
  const [fromToken, setFromToken] = useState(TOKEN_REGISTRY[0]);
  const [toToken, setToToken] = useState(TOKEN_REGISTRY[1]);
  const [amountInText, setAmountInText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { balances, isLoading: isBalanceLoading, refetch: refetchBalances } = useTokenBalances();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { mutateAsync: sendCallsSync, isPending: isSwapping } = useSendCallsSync();

  useEffect(() => {
    if (!blockNumber) {
      return;
    }
    void refetchBalances();
  }, [blockNumber, refetchBalances]);

  useEffect(() => {
    if (fromToken.address !== toToken.address) {
      return;
    }
    const fallback = TOKEN_REGISTRY.find((token) => token.address !== fromToken.address);
    if (fallback) {
      setToToken(fallback);
    }
  }, [fromToken, toToken.address]);

  const fromBalanceEntry = useMemo(
    () => balances.find((entry) => entry.token.address === fromToken.address),
    [balances, fromToken.address],
  );

  const toBalanceEntry = useMemo(
    () => balances.find((entry) => entry.token.address === toToken.address),
    [balances, toToken.address],
  );

  const amountInUnits = useMemo(() => {
    if (!amountInText) {
      return undefined;
    }
    try {
      return parseUnits(amountInText, fromToken.decimals);
    } catch {
      return undefined;
    }
  }, [amountInText, fromToken.decimals]);

  const isQuoteEnabled =
    Boolean(amountInUnits && amountInUnits > BigInt(0)) && fromToken.address !== toToken.address;

  const {
    data: quotedAmountOut,
    error: quoteError,
    isFetching: isQuoteFetching,
    refetch: refetchQuote,
  } = Hooks.dex.useSellQuote({
    tokenIn: fromToken.address,
    tokenOut: toToken.address,
    amountIn: amountInUnits ?? BigInt(0),
    query: { enabled: isQuoteEnabled },
  });

  const amountOutText = useMemo(() => {
    if (!quotedAmountOut) {
      return "0";
    }
    return formatUnits(quotedAmountOut, toToken.decimals);
  }, [quotedAmountOut, toToken.decimals]);

  const minAmountOut = useMemo(() => {
    if (!quotedAmountOut) {
      return undefined;
    }
    return (quotedAmountOut * (BPS_DENOMINATOR - SLIPPAGE_BPS)) / BPS_DENOMINATOR;
  }, [quotedAmountOut]);

  const rateText = useMemo(() => {
    if (!amountInUnits || !quotedAmountOut || amountInUnits === BigInt(0)) {
      return "-";
    }
    const input = toNumber(formatUnits(amountInUnits, fromToken.decimals));
    const output = toNumber(formatUnits(quotedAmountOut, toToken.decimals));
    if (!input || !output) {
      return "-";
    }
    return `${(output / input).toFixed(6)} ${toToken.symbol}`;
  }, [amountInUnits, quotedAmountOut, fromToken.decimals, toToken.decimals, toToken.symbol]);

  const insufficientBalance =
    Boolean(amountInUnits && fromBalanceEntry?.balance !== undefined) &&
    Boolean(fromBalanceEntry && amountInUnits! > fromBalanceEntry.balance);

  const disableSwap =
    isSwapping ||
    !isQuoteEnabled ||
    !quotedAmountOut ||
    !minAmountOut ||
    insufficientBalance ||
    Boolean(quoteError);

  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setTxHash(null);
    setErrorMessage("");
  };

  const handleSwap = async () => {
    setErrorMessage("");
    setTxHash(null);

    if (!amountInUnits || amountInUnits <= BigInt(0)) {
      setErrorMessage("Enter a valid amount.");
      return;
    }

    if (insufficientBalance) {
      setErrorMessage("Insufficient balance for selected token.");
      return;
    }

    if (!minAmountOut) {
      setErrorMessage("Quote unavailable. Try refresh.");
      return;
    }

    const loadingId = showLoading("Preparing atomic approve + swap...");
    try {
      const response = await sendCallsSync({
        calls: [
          Actions.token.approve.call({
            token: fromToken.address,
            spender: STABLECOIN_DEX_ADDRESS,
            amount: amountInUnits,
          }),
          Actions.dex.sell.call({
            tokenIn: fromToken.address,
            tokenOut: toToken.address,
            amountIn: amountInUnits,
            minAmountOut,
          }),
        ],
        forceAtomic: true,
      });

      const hash = response?.receipts?.[0]?.transactionHash;
      if (!hash) {
        throw new Error("Swap completed but transaction hash was not returned.");
      }

      setTxHash(hash);
      showSuccess("Swap completed", `Tx ${hash.slice(0, 10)}...${hash.slice(-8)}`);
      await refetchBalances();
      window.setTimeout(() => {
        void refetchBalances();
      }, 1200);
    } catch (error) {
      const pretty = prettyError(error);
      setErrorMessage(pretty);
      showError("Swap failed", pretty);
    } finally {
      dismissToast(loadingId);
    }
  };

  const handleCopy = async () => {
    if (!txHash) {
      return;
    }
    await navigator.clipboard.writeText(txHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[--font-display] text-2xl text-[--text-primary]">Swap</h1>
          <p className="mt-1 text-sm text-[--text-secondary]">Atomic stablecoin swap on Tempo DEX.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            void refetchBalances();
            void refetchQuote();
          }}
          className="h-10"
        >
          <ArrowsClockwise size={14} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Swap Tokens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.16em] text-[--text-tertiary]">From</p>
              <TokenSelector
                selectedToken={fromToken}
                onSelect={(token) => {
                  setFromToken(token);
                  setTxHash(null);
                }}
              />
              <AmountInput
                value={amountInText}
                onChange={(value) => {
                  setAmountInText(value);
                  setErrorMessage("");
                  setTxHash(null);
                }}
                token={fromToken}
                max={fromBalanceEntry?.formatted}
                disabled={isSwapping}
              />
              <p className="text-xs text-[--text-secondary]">
                Balance: {isBalanceLoading ? "..." : fromBalanceEntry?.formatted ?? "0"} {fromToken.symbol}
              </p>
            </div>

            <div className="flex justify-center">
              <Button type="button" variant="ghost" size="sm" onClick={handleFlip}>
                <ArrowsDownUp size={14} />
                Flip Pair
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.16em] text-[--text-tertiary]">To</p>
              <TokenSelector
                selectedToken={toToken}
                onSelect={(token) => {
                  setToToken(token);
                  setTxHash(null);
                }}
                tokens={TOKEN_REGISTRY.filter((token) => token.address !== fromToken.address)}
              />
              <div className="rounded-[--radius-md] border border-[--border-default] bg-[--bg-subtle] px-3 py-2.5">
                <p className="font-mono text-lg text-[--text-primary]">{isQuoteFetching ? "Quoting..." : amountOutText}</p>
                <p className="text-xs text-[--text-secondary]">Estimated output ({toToken.symbol})</p>
              </div>
              <p className="text-xs text-[--text-secondary]">
                Balance: {isBalanceLoading ? "..." : toBalanceEntry?.formatted ?? "0"} {toToken.symbol}
              </p>
            </div>

            {errorMessage ? (
              <p className="rounded-lg border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">
                {errorMessage}
              </p>
            ) : null}

            {quoteError ? (
              <p className="rounded-lg border border-[--status-warning-border] bg-[--status-warning-bg] px-3 py-2 text-xs text-[--status-warning-text]">
                Quote warning: {prettyError(quoteError)}
              </p>
            ) : null}

            <Button type="button" onClick={() => void handleSwap()} disabled={disableSwap} loading={isSwapping}>
              {isSwapping ? "Swapping..." : "Swap"}
            </Button>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Swap Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Status</span>
              <StatusBadge status={isSwapping ? "pending" : txHash ? "success" : "scheduled"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Rate</span>
              <span className="inline-flex items-center gap-1 text-sm text-[--text-primary]">
                <TrendUp size={14} />1 {fromToken.symbol} = {rateText}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Slippage</span>
              <span className="text-sm text-[--text-primary]">0.50%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Min received</span>
              <span className="font-mono text-sm text-[--text-primary]">
                {minAmountOut ? formatUnits(minAmountOut, toToken.decimals) : "-"}
              </span>
            </div>
            <div className="rounded-[--radius-md] border border-[--status-success-border] bg-[--status-success-bg] px-3 py-2 text-xs text-[--status-success-text]">
              Gas is sponsored and paid in stablecoin.
            </div>

            {txHash ? (
              <div className="space-y-2 rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] p-3">
                <p className="inline-flex items-center gap-1.5 text-sm text-[--status-success-text]">
                  <CheckCircle size={14} /> Swap successful
                </p>
                <p className="break-all font-mono text-xs text-[--text-secondary]">{txHash}</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => void handleCopy()}>
                    <Copy size={12} />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Link
                    href={`${EXPLORER_URL}/tx/${txHash}`}
                    target="_blank"
                    className="inline-flex h-8 items-center rounded-[--radius-md] border border-[--border-default] px-3 text-xs text-[--text-primary] hover:bg-[--bg-elevated]"
                  >
                    View on Explorer
                  </Link>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
