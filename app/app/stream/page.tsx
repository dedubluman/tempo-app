"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play, Stop, Waves } from "@phosphor-icons/react";
import { useAccount } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { isAddress, parseUnits } from "viem";
import { TokenSelector } from "@/components/ui/TokenSelector";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { EXPLORER_URL } from "@/lib/constants";
import { dismissToast, showError, showLoading, showSuccess } from "@/lib/toast";
import type { TokenInfo } from "@/types/token";

const INTERVAL_MS = 5000; // 5 seconds
const DURATION_OPTIONS = [
  { label: "1 min", seconds: 60 },
  { label: "5 min", seconds: 300 },
  { label: "15 min", seconds: 900 },
  { label: "30 min", seconds: 1800 },
] as const;

type StreamState = "idle" | "active" | "stopped" | "completed";

interface MicroTx {
  hash: string;
  timestamp: number;
}

function prettyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected")) {
    return "Action cancelled in passkey confirmation.";
  }
  if (lower.includes("insufficient") || lower.includes("sponsor") || lower.includes("fee")) {
    return "Insufficient balance or session key limit reached.";
  }
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("rpc")) {
    return "Network is slow. Retrying...";
  }
  return message.split("\n")[0] || "Transfer failed";
}

export default function StreamPage() {
  const { address } = useAccount();
  const [selectedToken, setSelectedToken] = useState<TokenInfo>(TOKEN_REGISTRY[0]);
  const [recipient, setRecipient] = useState("");
  const [amountPerTick, setAmountPerTick] = useState("0.001");
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [errorMessage, setErrorMessage] = useState("");

  // Stream state
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [totalSent, setTotalSent] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [microTxs, setMicroTxs] = useState<MicroTx[]>([]);
  const [failCount, setFailCount] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const { balances, isLoading: isBalanceLoading, refetch: refetchBalances } = useTokenBalances();
  const { mutateAsync: transferSync } = Hooks.token.useTransferSync();

  const balanceEntry = balances.find((b) => b.token.address === selectedToken.address);

  const totalTicks = Math.floor(durationSeconds / (INTERVAL_MS / 1000));
  const totalCost = totalTicks * Number.parseFloat(amountPerTick || "0");

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const executeMicroPayment = useCallback(async () => {
    if (!address) return;
    const loadingId = showLoading("Sending micro-payment...");
    try {
      const response = await transferSync({
        token: selectedToken.address as `0x${string}`,
        to: recipient as `0x${string}`,
        amount: parseUnits(amountPerTick, 6),
      });
      const hash = response?.receipt?.transactionHash;
      if (hash) {
        setMicroTxs((prev) => [...prev, { hash, timestamp: Date.now() }]);
        setTxCount((prev) => prev + 1);
        setTotalSent((prev) => prev + Number.parseFloat(amountPerTick));
      }
      dismissToast(loadingId);
    } catch (error) {
      dismissToast(loadingId);
      setFailCount((prev) => prev + 1);
      const pretty = prettyError(error);
      // Stop stream on critical errors (insufficient balance / limit reached)
      if (pretty.includes("Insufficient") || pretty.includes("limit")) {
        cleanup();
        setStreamState("stopped");
        showError("Stream stopped", pretty);
        return;
      }
    }
  }, [address, selectedToken.address, recipient, amountPerTick, transferSync, cleanup]);

  const handleStart = () => {
    setErrorMessage("");

    if (!recipient || !isAddress(recipient)) {
      setErrorMessage("Enter a valid recipient address (0x...).");
      return;
    }
    if (!amountPerTick || Number.parseFloat(amountPerTick) <= 0) {
      setErrorMessage("Enter a valid amount per interval.");
      return;
    }

    // Reset state
    setTotalSent(0);
    setTxCount(0);
    setElapsedSeconds(0);
    setMicroTxs([]);
    setFailCount(0);
    setStreamState("active");
    startTimeRef.current = Date.now();

    // Timer for elapsed seconds
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      // Auto-stop when duration reached
      if (elapsed >= durationSeconds) {
        cleanup();
        setStreamState("completed");
        showSuccess("Stream completed", "All scheduled micro-payments sent.");
        void refetchBalances();
      }
    }, 1000);

    // Execute first payment immediately
    void executeMicroPayment();

    // Then execute every 5 seconds
    intervalRef.current = setInterval(() => {
      void executeMicroPayment();
    }, INTERVAL_MS);

    showSuccess("Stream started", `Sending ${amountPerTick} ${selectedToken.symbol} every 5s`);
  };

  const handleStop = () => {
    cleanup();
    setStreamState("stopped");
    showSuccess("Stream stopped", `${txCount} micro-payments sent`);
    void refetchBalances();
  };

  const progressPct = durationSeconds > 0 ? Math.min(100, (elapsedSeconds / durationSeconds) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="font-[--font-display] text-2xl text-[--text-primary]">
          <Waves size={24} className="mr-2 inline-block" weight="duotone" />
          Streaming Payments
        </h1>
        <p className="mt-1 text-sm text-[--text-secondary]">
          Real on-chain micro-payments every 5 seconds using 2D nonces.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Configuration / Active Stream */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{streamState === "idle" ? "Configure Stream" : "Active Stream"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {streamState === "idle" && (
              <>
                <Input
                  label="Recipient Address"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    setErrorMessage("");
                  }}
                />
                <TokenSelector selectedToken={selectedToken} onSelect={setSelectedToken} />
                <Input
                  label="Amount per interval (5s)"
                  placeholder="0.001"
                  type="number"
                  value={amountPerTick}
                  onChange={(e) => setAmountPerTick(e.target.value)}
                  helperText={`Total: ~${totalCost.toFixed(6)} ${selectedToken.symbol} over ${durationSeconds}s (${totalTicks} payments)`}
                />
                <p className="text-xs text-[--text-secondary]">
                  Balance: {isBalanceLoading ? "..." : balanceEntry?.formatted ?? "0"} {selectedToken.symbol}
                </p>
                <div>
                  <label className="mb-1 block text-xs text-[--text-tertiary]">Duration</label>
                  <div className="flex gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.seconds}
                        type="button"
                        onClick={() => setDurationSeconds(opt.seconds)}
                        className={`rounded-[--radius-md] border px-3 py-1.5 text-xs transition-colors ${
                          durationSeconds === opt.seconds
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                            : "border-[--border-default] text-[--text-secondary] hover:bg-[--bg-subtle]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {errorMessage && (
                  <p className="rounded-lg border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">
                    {errorMessage}
                  </p>
                )}

                <Button
                  type="button"
                  onClick={handleStart}
                  disabled={!address || !recipient || !amountPerTick}
                >
                  <Play size={14} />
                  Start Stream
                </Button>
              </>
            )}

            {(streamState === "active" || streamState === "stopped" || streamState === "completed") && (
              <>
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[--text-secondary]">
                    <span>{elapsedSeconds}s elapsed</span>
                    <span>{durationSeconds}s total</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[--bg-subtle]">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-1000"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] p-3 text-center">
                    <p className="font-mono text-lg font-bold text-[--text-primary]">{txCount}</p>
                    <p className="text-xs text-[--text-secondary]">Txs Sent</p>
                  </div>
                  <div className="rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] p-3 text-center">
                    <p className="font-mono text-lg font-bold text-[--text-primary]">{totalSent.toFixed(6)}</p>
                    <p className="text-xs text-[--text-secondary]">{selectedToken.symbol} Sent</p>
                  </div>
                  <div className="rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] p-3 text-center">
                    <p className="font-mono text-lg font-bold text-[--text-primary]">{failCount}</p>
                    <p className="text-xs text-[--text-secondary]">Failed</p>
                  </div>
                </div>

                {/* Recent Transactions */}
                {microTxs.length > 0 && (
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {microTxs
                      .slice(-5)
                      .reverse()
                      .map((tx) => (
                        <div
                          key={tx.hash}
                          className="flex items-center justify-between rounded-[--radius-md] bg-[--bg-subtle] px-3 py-1.5"
                        >
                          <span className="font-mono text-xs text-[--text-secondary]">
                            {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                          </span>
                          <Link
                            href={`${EXPLORER_URL}/tx/${tx.hash}`}
                            target="_blank"
                            className="text-xs text-amber-400 underline"
                          >
                            View
                          </Link>
                        </div>
                      ))}
                  </div>
                )}

                {streamState === "active" && (
                  <Button type="button" variant="secondary" onClick={handleStop}>
                    <Stop size={14} />
                    Stop Stream
                  </Button>
                )}

                {(streamState === "stopped" || streamState === "completed") && (
                  <>
                    <div className="rounded-[--radius-md] border border-[--status-success-border] bg-[--status-success-bg] px-3 py-2">
                      <p className="text-sm font-medium text-[--status-success-text]">
                        {streamState === "completed" ? "Stream Completed" : "Stream Stopped"}
                      </p>
                      <p className="text-xs text-[--status-success-text]/80">
                        {txCount} micro-payments totaling {totalSent.toFixed(6)} {selectedToken.symbol}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setStreamState("idle");
                        setTotalSent(0);
                        setTxCount(0);
                        setElapsedSeconds(0);
                        setMicroTxs([]);
                        setFailCount(0);
                      }}
                    >
                      New Stream
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Panel */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Stream Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Status</span>
              <StatusBadge
                status={
                  streamState === "active"
                    ? "streaming"
                    : streamState === "completed"
                      ? "success"
                      : streamState === "stopped"
                        ? "failed"
                        : "scheduled"
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Interval</span>
              <span className="text-sm text-[--text-primary]">5 seconds</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Per payment</span>
              <span className="font-mono text-sm text-[--text-primary]">{amountPerTick} {selectedToken.symbol}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Est. total</span>
              <span className="font-mono text-sm text-[--text-primary]">{totalCost.toFixed(6)} {selectedToken.symbol}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Est. fees</span>
              <span className="font-mono text-sm text-[--text-primary]">~${(totalTicks * 0.001).toFixed(4)}</span>
            </div>
            <div className="rounded-[--radius-md] border border-[--status-success-border] bg-[--status-success-bg] px-3 py-2 text-xs text-[--status-success-text]">
              Each micro-payment uses 2D nonces (nonceKey) for parallel execution. Gas is sponsored.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
