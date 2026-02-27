"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, Clock, Copy, Trash } from "@phosphor-icons/react";
import { useAccount } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { isAddress, parseUnits } from "viem";
import { TokenSelector } from "@/components/ui/TokenSelector";
import { AmountInput } from "@/components/ui/AmountInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { EXPLORER_URL } from "@/lib/constants";
import { dismissToast, showError, showLoading, showSuccess } from "@/lib/toast";
import type { TokenInfo } from "@/types/token";

const STORAGE_KEY = "tempo.scheduledPayments.v1";

type ScheduledStatus = "pending" | "broadcasting" | "confirmed" | "expired" | "failed";

interface ScheduledPayment {
  id: string;
  recipient: string;
  amount: string;
  token: string;
  memo: string;
  validAfter: number; // Unix seconds
  validBefore: number; // Unix seconds
  status: ScheduledStatus;
  txHash?: string;
  createdAt: number;
}

function prettyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected")) {
    return "Action cancelled in passkey confirmation.";
  }
  if (lower.includes("insufficient") || lower.includes("sponsor") || lower.includes("fee")) {
    return "Insufficient balance or fee sponsorship issue.";
  }
  if (lower.includes("expired") || lower.includes("valid")) {
    return "Transaction time window has expired.";
  }
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("rpc")) {
    return "Network is slow. Please retry in a moment.";
  }
  return message.split("\n")[0] || "Operation failed";
}

function loadScheduled(): ScheduledPayment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScheduledPayment[]) : [];
  } catch {
    return [];
  }
}

function saveScheduled(items: ScheduledPayment[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Now";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SchedulePage() {
  const { address } = useAccount();
  const [selectedToken, setSelectedToken] = useState<TokenInfo>(TOKEN_REGISTRY[0]);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memoText, setMemoText] = useState("");
  const [delayMinutes, setDelayMinutes] = useState("1");
  const [windowMinutes, setWindowMinutes] = useState("5");
  const [errorMessage, setErrorMessage] = useState("");
  const [scheduled, setScheduled] = useState<ScheduledPayment[]>([]);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const { balances, isLoading: isBalanceLoading } = useTokenBalances();
  const { mutateAsync: transferSync, isPending: isScheduling } = Hooks.token.useTransferSync();

  const balanceEntry = useMemo(
    () => balances.find((b) => b.token.address === selectedToken.address),
    [balances, selectedToken.address],
  );

  // Load scheduled payments from localStorage
  useEffect(() => {
    setScheduled(loadScheduled());
  }, []);

  // Tick every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-expire payments whose window has passed
  useEffect(() => {
    setScheduled((prev) => {
      let changed = false;
      const next = prev.map((p) => {
        if (p.status === "pending" && now >= p.validBefore) {
          changed = true;
          return { ...p, status: "expired" as const };
        }
        return p;
      });
      if (changed) saveScheduled(next);
      return changed ? next : prev;
    });
  }, [now]);

  // Execute pending payments when their window opens
  const executePending = useCallback(async () => {
    const pending = scheduled.filter(
      (p) => p.status === "pending" && now >= p.validAfter && now < p.validBefore,
    );
    if (pending.length === 0) return;

    for (const payment of pending) {
      // Mark as broadcasting
      setScheduled((prev) => {
        const next = prev.map((p) =>
          p.id === payment.id ? { ...p, status: "broadcasting" as const } : p,
        );
        saveScheduled(next);
        return next;
      });

      try {
        const response = await transferSync({
          token: payment.token as `0x${string}`,
          to: payment.recipient as `0x${string}`,
          amount: parseUnits(payment.amount, 6),
        });
        const hash = response?.receipt?.transactionHash;
        setScheduled((prev) => {
          const next = prev.map((p) =>
            p.id === payment.id
              ? { ...p, status: "confirmed" as const, txHash: hash }
              : p,
          );
          saveScheduled(next);
          return next;
        });
        showSuccess("Scheduled payment executed", `Tx: ${hash?.slice(0, 10)}...`);
      } catch (error) {
        const pretty = prettyError(error);
        setScheduled((prev) => {
          const next = prev.map((p) =>
            p.id === payment.id ? { ...p, status: "failed" as const } : p,
          );
          saveScheduled(next);
          return next;
        });
        showError("Scheduled payment failed", pretty);
      }
    }
  }, [scheduled, now, transferSync]);

  useEffect(() => {
    void executePending();
  }, [executePending]);

  const handleSchedule = () => {
    setErrorMessage("");

    if (!recipient || !isAddress(recipient)) {
      setErrorMessage("Enter a valid recipient address (0x...).");
      return;
    }
    if (!amount || Number.parseFloat(amount) <= 0) {
      setErrorMessage("Enter a valid amount.");
      return;
    }

    const delay = Number.parseInt(delayMinutes, 10);
    const window_ = Number.parseInt(windowMinutes, 10);
    if (!delay || delay < 1) {
      setErrorMessage("Delay must be at least 1 minute.");
      return;
    }

    const validAfter = now + delay * 60;
    const validBefore = validAfter + window_ * 60;

    const payment: ScheduledPayment = {
      id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recipient,
      amount,
      token: selectedToken.address,
      memo: memoText,
      validAfter,
      validBefore,
      status: "pending",
      createdAt: now,
    };

    const next = [payment, ...scheduled];
    setScheduled(next);
    saveScheduled(next);

    // Reset form
    setRecipient("");
    setAmount("");
    setMemoText("");
    showSuccess("Payment scheduled", `Will execute in ${delayMinutes} minute(s)`);
  };

  const handleDelete = (id: string) => {
    const next = scheduled.filter((p) => p.id !== id);
    setScheduled(next);
    saveScheduled(next);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="font-[--font-display] text-2xl text-[--text-primary]">Scheduled Payments</h1>
        <p className="mt-1 text-sm text-[--text-secondary]">
          Time-lock payments with validAfter/validBefore — auto-execute when the time window opens.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Schedule Form */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New Scheduled Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Recipient Address"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setErrorMessage("");
              }}
              disabled={isScheduling}
            />

            <TokenSelector selectedToken={selectedToken} onSelect={setSelectedToken} />

            <AmountInput
              value={amount}
              onChange={(v) => {
                setAmount(v);
                setErrorMessage("");
              }}
              token={selectedToken}
              max={balanceEntry?.formatted}
              disabled={isScheduling}
            />
            <p className="text-xs text-[--text-secondary]">
              Balance: {isBalanceLoading ? "..." : balanceEntry?.formatted ?? "0"} {selectedToken.symbol}
            </p>

            <Input
              label="Memo (optional)"
              placeholder="e.g. rent-march"
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              disabled={isScheduling}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-[--text-tertiary]">Execute after (minutes)</label>
                <select
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(e.target.value)}
                  className="w-full rounded-[--radius-md] border border-[--border-default] bg-[--bg-surface] px-3 py-2 text-sm text-[--text-primary]"
                >
                  <option value="1">1 min</option>
                  <option value="2">2 min</option>
                  <option value="5">5 min</option>
                  <option value="10">10 min</option>
                  <option value="30">30 min</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[--text-tertiary]">Valid for (minutes)</label>
                <select
                  value={windowMinutes}
                  onChange={(e) => setWindowMinutes(e.target.value)}
                  className="w-full rounded-[--radius-md] border border-[--border-default] bg-[--bg-surface] px-3 py-2 text-sm text-[--text-primary]"
                >
                  <option value="5">5 min</option>
                  <option value="10">10 min</option>
                  <option value="30">30 min</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
            </div>

            {errorMessage && (
              <p className="rounded-lg border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">
                {errorMessage}
              </p>
            )}

            <Button
              type="button"
              onClick={handleSchedule}
              loading={isScheduling}
              disabled={isScheduling || !recipient || !amount}
            >
              <Clock size={14} />
              Schedule Payment
            </Button>
          </CardContent>
        </Card>

        {/* Info Panel */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-xs text-[--text-secondary]">
              <p>1. Set recipient, amount, and time delay.</p>
              <p>2. Payment queues locally with a countdown timer.</p>
              <p>3. When the time window opens, the payment auto-executes via Tempo validAfter/validBefore.</p>
              <p>4. If the window expires without execution, the payment is marked expired.</p>
            </div>
            <div className="rounded-[--radius-md] border border-[--status-success-border] bg-[--status-success-bg] px-3 py-2 text-xs text-[--status-success-text]">
              Gas is sponsored and paid in stablecoin.
            </div>
            <div className="rounded-[--radius-md] border border-[--status-warning-border] bg-[--status-warning-bg] px-3 py-2 text-xs text-[--status-warning-text]">
              Keep this tab open — payments execute client-side.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Payments Queue */}
      {scheduled.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 font-[--font-display] text-lg text-[--text-primary]">Payment Queue</h2>
          <div className="space-y-3">
            {scheduled.map((payment) => {
              const tokenInfo = TOKEN_REGISTRY.find((t) => t.address === payment.token);
              const secondsUntil = payment.validAfter - now;
              const isInWindow = now >= payment.validAfter && now < payment.validBefore;

              return (
                <Card key={payment.id} variant="elevated">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="space-y-1">
                      <p className="font-mono text-sm text-[--text-primary]">
                        {payment.amount} {tokenInfo?.symbol ?? "?"}
                      </p>
                      <p className="font-mono text-xs text-[--text-secondary]">
                        → {payment.recipient.slice(0, 8)}...{payment.recipient.slice(-6)}
                      </p>
                      {payment.memo && (
                        <p className="text-xs text-[--text-tertiary]">Memo: {payment.memo}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {payment.status === "pending" && (
                        <div className="text-right">
                          {isInWindow ? (
                            <p className="text-xs text-amber-400">Executing...</p>
                          ) : (
                            <p className="font-mono text-sm text-[--text-primary]">
                              {formatCountdown(secondsUntil)}
                            </p>
                          )}
                        </div>
                      )}
                      <StatusBadge status={payment.status === "confirmed" ? "success" : payment.status === "broadcasting" ? "pending" : payment.status === "expired" ? "failed" : payment.status} />
                      {payment.txHash && (
                        <Link
                          href={`${EXPLORER_URL}/tx/${payment.txHash}`}
                          target="_blank"
                          className="text-xs text-amber-400 underline"
                        >
                          Tx
                        </Link>
                      )}
                      {(payment.status === "confirmed" || payment.status === "expired" || payment.status === "failed") && (
                        <button
                          type="button"
                          onClick={() => handleDelete(payment.id)}
                          className="text-[--text-tertiary] hover:text-[--status-error-text]"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
