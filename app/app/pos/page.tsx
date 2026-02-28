"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, Backspace, Storefront } from "@phosphor-icons/react";
import { useAccount, useBlockNumber } from "wagmi";
import { maxUint256, parseUnits } from "viem";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { TokenSelector } from "@/components/ui/TokenSelector";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { EXPLORER_URL } from "@/lib/constants";
import type { TokenInfo } from "@/types/token";
import { createPaymentDetector } from "@/lib/paymentDetector";
import { isNfcSupported, writeNfcPaymentUrl } from "@/lib/nfcWriter";
import { FeatureGate } from "@/components/ui/FeatureGate";
import { FeatureFlag } from "@/lib/featureFlags";

type PosState = "keypad" | "qr" | "success";

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;
/** TIP-1009: max expiry window is 30s; we use 15s to stay well within limit */
const PAYMENT_WINDOW_SECS = 15;
const DEBOUNCE_SECS = 3;
const MAX_RECENT_TXS = 10;

function buildPayUrl(
  to: string,
  amount: string,
  token: string,
  memo: string,
  validBefore: number,
): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams();
  params.set("to", to);
  params.set("amount", amount);
  params.set("token", token);
  if (memo) params.set("memo", memo);
  // TIP-1009 expiring nonce: nonceKey=maxUint256 signals expiring-nonce mode
  params.set("nonceKey", maxUint256.toString());
  params.set("validBefore", validBefore.toString());
  return `${base}/pay?${params.toString()}`;
}

function playSuccessSound(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext unavailable or blocked — skip sound
  }
}

export default function PosPage() {
  const { address } = useAccount();
  const [selectedToken, setSelectedToken] = useState<TokenInfo>(TOKEN_REGISTRY[0]);
  const [amount, setAmount] = useState("0");
  const [memo, setMemo] = useState("");
  const [state, setState] = useState<PosState>("keypad");
  const [payUrl, setPayUrl] = useState("");
  const [receivedTxHash, setReceivedTxHash] = useState<string | null>(null);
  const autoResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paymentDetected, setPaymentDetected] = useState(false);

  // Debounce: prevent rapid QR regeneration
  const [isDebounced, setIsDebounced] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Duplicate TX tracking (last MAX_RECENT_TXS payment events)
  const [recentTxHashes, setRecentTxHashes] = useState<string[]>([]);
  const recentTxHashesRef = useRef<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // Payment window countdown
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { balances, refetch: refetchBalances } = useTokenBalances();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const prevBalanceRef = useRef<bigint | undefined>(undefined);

  // Track balance for payment detection
  const currentBalance = balances.find((b) => b.token.address === selectedToken.address)?.balance;

  function stopCountdown() {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }

  const handleReset = useCallback(() => {
    setState("keypad");
    setAmount("0");
    setMemo("");
    setPayUrl("");
    setReceivedTxHash(null);
    setDuplicateWarning(false);
    setCountdown(null);
    setIsExpired(false);
    setPaymentDetected(false);
    stopCountdown();
    if (autoResetRef.current) {
      clearTimeout(autoResetRef.current);
      autoResetRef.current = null;
    }
  }, []);

  // Countdown interval — starts/stops with QR state
  useEffect(() => {
    if (state !== "qr") {
      stopCountdown();
      return;
    }
    stopCountdown();
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return stopCountdown;
  }, [state]);

  // Mark expired when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && state === "qr") {
      stopCountdown();
      setIsExpired(true);
    }
  }, [countdown, state]);

  // Payment detection via balance monitoring
  useEffect(() => {
    if (state !== "qr") {
      prevBalanceRef.current = currentBalance;
      return;
    }
    if (
      prevBalanceRef.current !== undefined &&
      currentBalance !== undefined &&
      currentBalance > prevBalanceRef.current
    ) {
      // Detection ID: token address + exact new balance (unique per payment event)
      const detectionId = `${selectedToken.address}:${currentBalance.toString()}`;

      if (recentTxHashesRef.current.includes(detectionId)) {
        setDuplicateWarning(true);
      } else {
        const updated = [detectionId, ...recentTxHashesRef.current].slice(0, MAX_RECENT_TXS);
        recentTxHashesRef.current = updated;
        setRecentTxHashes(updated);
        window.setTimeout(() => {
          setState("success");
        }, 0);
        autoResetRef.current = setTimeout(() => {
          handleReset();
        }, 5000);
      }
    }
    prevBalanceRef.current = currentBalance;
    // selectedToken.address intentionally omitted — ref access avoids stale closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBalance, state]);

  useEffect(() => {
    if (!blockNumber) return;
    void refetchBalances();
  }, [blockNumber, refetchBalances]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (autoResetRef.current) clearTimeout(autoResetRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      stopCountdown();
    };
  }, []);

  // WebSocket payment detector — starts when QR is displayed, cleans up on exit
  useEffect(() => {
    if (state !== "qr" || !address) return;

    let expectedAmount: bigint;
    try {
      expectedAmount = parseUnits(amount, selectedToken.decimals);
    } catch {
      return;
    }
    if (expectedAmount === BigInt(0)) return;

    const detector = createPaymentDetector({
      merchantAddress: address,
      expectedToken: selectedToken.address,
      expectedAmount,
      onPaymentDetected: (txHash) => {
        setReceivedTxHash(txHash);
        setPaymentDetected(true);
        playSuccessSound();
      },
      onTimeout: handleReset,
    });

    detector.start();

    return () => {
      detector.stop();
    };
  }, [state, address, amount, selectedToken, handleReset]);

  const handleKeyPress = useCallback((key: string) => {
    setAmount((prev) => {
      if (key === "del") {
        const next = prev.slice(0, -1);
        return next || "0";
      }
      if (key === ".") {
        return prev.includes(".") ? prev : prev + ".";
      }
      // Enforce 6 decimal max
      const dotIdx = prev.indexOf(".");
      if (dotIdx !== -1 && prev.length - dotIdx > 6) return prev;
      // Replace leading zero
      if (prev === "0" && key !== ".") return key;
      return prev + key;
    });
  }, []);

  const handleGenerateQR = () => {
    if (!address || !amount || Number.parseFloat(amount) <= 0) return;
    // TIP-1009: validBefore = now + 15s (well within the 30s Tempo protocol limit)
    const validBefore = Math.floor(Date.now() / 1000) + PAYMENT_WINDOW_SECS;
    const url = buildPayUrl(address, amount, selectedToken.symbol, memo, validBefore);
    setPayUrl(url);
    prevBalanceRef.current = currentBalance;
    setIsExpired(false);
    setDuplicateWarning(false);
    setCountdown(PAYMENT_WINDOW_SECS);
    setState("qr");

    // Debounce: disable button for DEBOUNCE_SECS seconds to prevent rapid regeneration
    setIsDebounced(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsDebounced(false);
    }, DEBOUNCE_SECS * 1000);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="font-[--font-display] text-2xl text-[--text-primary]">
          <Storefront size={24} className="mr-2 inline-block" weight="duotone" />
          POS Terminal
        </h1>
        <p className="mt-1 text-sm text-[--text-secondary]">Merchant receive mode — generate QR for customer payments.</p>
      </div>

      {/* Keypad State */}
      {state === "keypad" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Enter Amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount Display */}
              <div className="rounded-[--radius-md] border border-[--border-default] bg-[--bg-subtle] px-4 py-6 text-center">
                <p className="font-mono text-4xl font-bold text-[--text-primary]">{amount}</p>
                <p className="mt-1 text-sm text-[--text-secondary]">{selectedToken.symbol}</p>
              </div>

              {/* Keypad Grid */}
              <div className="grid grid-cols-3 gap-2">
                {KEYPAD_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyPress(key)}
                    className="flex h-14 items-center justify-center rounded-[--radius-md] border border-[--border-default] bg-[--bg-surface] text-lg font-medium text-[--text-primary] transition-colors hover:bg-[--bg-subtle] active:bg-[--bg-elevated]"
                  >
                    {key === "del" ? <Backspace size={20} /> : key}
                  </button>
                ))}
              </div>

              <TokenSelector selectedToken={selectedToken} onSelect={setSelectedToken} />

              <Input
                label="Order Number / Memo (optional)"
                placeholder="e.g. order-001"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />

              <Button
                type="button"
                onClick={handleGenerateQR}
                disabled={!address || amount === "0" || Number.parseFloat(amount) <= 0 || isDebounced}
              >
                {isDebounced ? "Wait..." : "Generate QR Code"}
              </Button>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>POS Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[--text-secondary]">Mode</span>
                <StatusBadge status="scheduled" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[--text-secondary]">Merchant</span>
                <span className="font-mono text-xs text-[--text-primary]">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[--text-secondary]">Token</span>
                <span className="text-sm text-[--text-primary]">{selectedToken.symbol}</span>
              </div>
              <div className="rounded-[--radius-md] border border-[--status-success-border] bg-[--status-success-bg] px-3 py-2 text-xs text-[--status-success-text]">
                Payments are gasless for customers via fee sponsorship.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR Display State */}
      {state === "qr" && (
        <div className="flex flex-col items-center gap-6">
          <Card variant="elevated" className="w-full max-w-md text-center">
            <CardContent className="space-y-4 py-8">
              <p className="text-xs uppercase tracking-[0.16em] text-[--text-tertiary]">
                Scan to pay
              </p>
              <div className="flex justify-center">
                <QRCodeDisplay data={payUrl} size={280} />
              </div>
              <FeatureGate flag={FeatureFlag.NFC_PAYMENT}>
                {isNfcSupported() && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      writeNfcPaymentUrl({
                        paymentUrl: payUrl,
                        onSuccess: () => { /* NFC write success handled silently */ },
                        onError: () => { /* NFC errors are non-critical */ },
                      });
                    }}
                  >
                    Tap to Pay (NFC)
                  </Button>
                )}
              </FeatureGate>
              <div className="space-y-1">
                <p className="font-mono text-3xl font-bold text-[--text-primary]">{amount}</p>
                <p className="text-sm text-[--text-secondary]">{selectedToken.symbol}</p>
                {memo && <p className="text-xs text-[--text-tertiary]">Ref: {memo}</p>}
              </div>

              {/* Payment window countdown / expiry indicator */}
              <div aria-live="polite" aria-atomic="true">
              {isExpired ? (
                <div className="rounded-[--radius-md] border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">
                  Expired — Generate new QR
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs text-[--text-secondary]">
                  <span
                    className={`inline-block h-2 w-2 animate-pulse rounded-full ${
                      paymentDetected ? "bg-emerald-400" : "bg-amber-500"
                    }`}
                  />
                  {paymentDetected
                    ? "Payment detected! Confirming..."
                    : countdown !== null
                    ? `Payment window: ${countdown}s`
                    : "Waiting for payment..."}
                </div>
              )}
              </div>

              {/* Duplicate payment warning */}
              {duplicateWarning && (
                <div className="rounded-[--radius-md] border border-[--status-warning-border] bg-[--status-warning-bg] px-3 py-2 text-xs text-[--status-warning-text]">
                  Payment already processed
                </div>
              )}

              <Button type="button" variant="secondary" onClick={handleReset}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success State */}
      {state === "success" && (
        <div className="flex flex-col items-center gap-6">
          <Card variant="elevated" className="w-full max-w-md text-center">
            <CardContent className="space-y-4 py-8">
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle size={48} weight="fill" className="text-emerald-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-[--status-success-text]">Payment Received!</p>
              <div className="space-y-1">
                <p className="font-mono text-3xl font-bold text-[--text-primary]">{amount}</p>
                <p className="text-sm text-[--text-secondary]">{selectedToken.symbol}</p>
                {memo && <p className="text-xs text-[--text-tertiary]">Ref: {memo}</p>}
              </div>
              {receivedTxHash && (
                <a
                  href={`${EXPLORER_URL}/tx/${receivedTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 underline"
                >
                  View on Explorer
                </a>
              )}
              <p className="text-xs text-[--text-tertiary]">Auto-resetting in 5 seconds...</p>
              <Button type="button" onClick={handleReset}>
                Next Transaction
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
