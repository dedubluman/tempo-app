"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock, Trash } from "@phosphor-icons/react";
import { Hooks } from "wagmi/tempo";
import { getAddress, isAddress, pad, parseUnits, stringToHex } from "viem";
import { TokenSelector } from "@/components/ui/TokenSelector";
import { AmountInput } from "@/components/ui/AmountInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { EXPLORER_URL } from "@/lib/constants";
import {
  applySessionSpend,
  clearSessionAuthorization,
  createSession,
  getAccessAccountForSession,
  getSessionById,
} from "@/lib/sessionManager";
import { showError, showSuccess } from "@/lib/toast";
import type { TokenInfo } from "@/types/token";

const STORAGE_KEY = "tempo.scheduledPayments.v1";

type ScheduledStatus = "pending" | "broadcasting" | "confirmed" | "expired" | "failed";

interface ScheduledPayment {
  id: string;
  recipient: string;
  amount: string;
  token: string;
  memo: string;
  sessionId?: string;
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
  const [selectedToken, setSelectedToken] = useState<TokenInfo>(TOKEN_REGISTRY[0]);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memoText, setMemoText] = useState("");
  const [delayMinutes, setDelayMinutes] = useState("1");
  const [windowMinutes, setWindowMinutes] = useState("5");
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [scheduled, setScheduled] = useState<ScheduledPayment[]>(() => loadScheduled());
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const { balances, isLoading: isBalanceLoading } = useTokenBalances();
  const { mutateAsync: transferSync, isPending: isScheduling } = Hooks.token.useTransferSync();
  const isSchedulingAction = isScheduling || isAuthorizing;

  const balanceEntry = useMemo(
    () => balances.find((b) => b.token.address === selectedToken.address),
    [balances, selectedToken.address],
  );

  // Tick every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
        if (!payment.sessionId) {
          throw new Error("Session key not found for scheduled payment.");
        }

        const session = getSessionById(payment.sessionId);
        if (!session) {
          throw new Error("Session key is unavailable. Recreate the schedule.");
        }

        const tokenInfo = TOKEN_REGISTRY.find((token) => token.address === payment.token);
        const tokenDecimals = tokenInfo?.decimals ?? 6;
        const amountUnits = parseUnits(payment.amount, tokenDecimals);
        const memoBytes32 = payment.memo.trim()
          ? pad(stringToHex(payment.memo.trim()), { size: 32 })
          : undefined;
        const accessAccount = getAccessAccountForSession(session);
        const baseRequest = {
          token: payment.token as `0x${string}`,
          to: payment.recipient as `0x${string}`,
          amount: amountUnits,
          ...(memoBytes32 ? { memo: memoBytes32 } : {}),
        };

        const response = await (async () => {
          try {
            return await transferSync({
              ...baseRequest,
              account: accessAccount,
              ...(session.keyAuthorization ? { keyAuthorization: session.keyAuthorization } : {}),
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (session.keyAuthorization && message.includes("KeyAlreadyExists")) {
              clearSessionAuthorization(session.id);
              return transferSync({
                ...baseRequest,
                account: accessAccount,
              });
            }
            throw error;
          }
        })();

        const hash = response?.receipt?.transactionHash;
        if (!hash) {
          throw new Error("Transaction hash missing from scheduled execution.");
        }

        applySessionSpend(session.id, payment.token as `0x${string}`, amountUnits);
        if (session.keyAuthorization) {
          clearSessionAuthorization(session.id);
        }

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

  const executePendingRef = useRef(executePending);

  useEffect(() => {
    executePendingRef.current = executePending;
  }, [executePending]);

  useEffect(() => {
    const timer = setInterval(() => {
      void executePendingRef.current();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSchedule = async () => {
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
    if (!window_ || window_ < 1) {
      setErrorMessage("Execution window must be at least 1 minute.");
      return;
    }

    let amountUnits: bigint;
    try {
      amountUnits = parseUnits(amount, selectedToken.decimals);
    } catch {
      setErrorMessage("Amount format is invalid for selected token.");
      return;
    }

    const checksummedRecipient = getAddress(recipient);
    const sessionDuration = delay + window_;

    setIsAuthorizing(true);

    let sessionId: string;
    try {
      const session = await createSession({
        durationMinutes: sessionDuration,
        spendLimits: new Map([[selectedToken.address, amountUnits]]),
        allowedRecipients: [checksummedRecipient],
      });
      sessionId = session.id;
    } catch (error) {
      const message = prettyError(error);
      setErrorMessage(message);
      showError("Scheduling failed", message);
      setIsAuthorizing(false);
      return;
    }

    const validAfter = now + delay * 60;
    const validBefore = validAfter + window_ * 60;

    const payment: ScheduledPayment = {
      id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recipient: checksummedRecipient,
      amount,
      token: selectedToken.address,
      memo: memoText,
      sessionId,
      validAfter,
      validBefore,
      status: "pending",
      createdAt: now,
    };

    setScheduled((prev) => {
      const next = [payment, ...prev];
      saveScheduled(next);
      return next;
    });

    // Reset form
    setRecipient("");
    setAmount("");
    setMemoText("");
    showSuccess("Payment scheduled", `Authorized now, will execute in ${delayMinutes} minute(s)`);
    setIsAuthorizing(false);
  };

  const handleDelete = (id: string) => {
    const next = scheduled.filter((p) => p.id !== id);
    setScheduled(next);
    saveScheduled(next);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28 md:pb-10">
      <div className="mb-6">
        <h1 className="font-[--font-display] text-2xl font-bold tracking-tight text-[--text-primary]">Scheduled Payments</h1>
        <p className="mt-1 text-sm text-[--text-secondary]">
          Time-lock payments with validAfter/validBefore — auto-execute when the time window opens.
        </p>
      </div>

      <div className="space-y-5">
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
              disabled={isSchedulingAction}
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
              disabled={isSchedulingAction}
            />
            <p className="text-xs text-[--text-secondary]">
              Balance: {isBalanceLoading ? "..." : balanceEntry?.formatted ?? "0"} {selectedToken.symbol}
            </p>

            <Input
              label="Memo (optional)"
              placeholder="e.g. rent-march"
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              disabled={isSchedulingAction}
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
                <label className="mb-1 block text-xs text-[--text-tertiary]">Execution window</label>
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
                <p className="mt-1 text-xs text-[--text-tertiary]">
                  How long after the delay the payment can execute. If the window expires, payment is cancelled.
                </p>
              </div>
            </div>

            {errorMessage && (
              <p className="rounded-lg border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">
                {errorMessage}
              </p>
            )}

            <Button
              type="button"
              onClick={() => void handleSchedule()}
              loading={isSchedulingAction}
              disabled={isSchedulingAction || !recipient || !amount}
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
              const isWindowExpired = payment.status === "pending" && now >= payment.validBefore;
              const displayStatus: ScheduledStatus = isWindowExpired ? "expired" : payment.status;

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
                      {displayStatus === "pending" && (
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
                      <StatusBadge status={displayStatus === "confirmed" ? "success" : displayStatus === "broadcasting" ? "pending" : displayStatus === "expired" ? "failed" : displayStatus} />
                      {payment.txHash && (
                        <Link
                          href={`${EXPLORER_URL}/tx/${payment.txHash}`}
                          target="_blank"
                          className="text-xs text-amber-400 underline"
                        >
                          Tx
                        </Link>
                      )}
                      {(displayStatus === "confirmed" || displayStatus === "expired" || displayStatus === "failed") && (
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
