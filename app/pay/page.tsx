"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { CheckCircle, Copy, Wallet } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { Hooks } from "wagmi/tempo";
import {
  formatUnits,
  getAddress,
  isAddress,
  pad,
  parseUnits,
  stringToHex,
} from "viem";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EXPLORER_URL } from "@/lib/constants";
import { showError, showSuccess } from "@/lib/toast";
import { addTransferHistoryEntries } from "@/lib/transactionHistoryStore";
import { getTokenBySymbol } from "@/lib/tokens";

type ParsedRequest = {
  to: `0x${string}`;
  amount: string;
  amountUnits: bigint;
  tokenSymbol: string;
  memo: string;
};

function parseRequestParams(params: URLSearchParams): {
  request: ParsedRequest | null;
  error: string;
} {
  const toRaw = params.get("to") ?? "";
  const amountRaw = params.get("amount") ?? "";
  const tokenSymbol = params.get("token") ?? "pathUSD";
  const memo = params.get("memo") ?? "";

  if (!toRaw || !isAddress(toRaw)) {
    return { request: null, error: "Invalid recipient address." };
  }

  const token = getTokenBySymbol(tokenSymbol);
  if (!token) {
    return { request: null, error: "Unknown token symbol in request." };
  }

  let amountUnits = BigInt(0);
  try {
    amountUnits = parseUnits(amountRaw, token.decimals);
    if (amountUnits <= BigInt(0)) {
      return { request: null, error: "Amount must be greater than zero." };
    }
  } catch {
    return { request: null, error: "Invalid amount format." };
  }

  if (new TextEncoder().encode(memo).length > 32) {
    return { request: null, error: "Memo exceeds 32 bytes." };
  }

  return {
    request: {
      to: getAddress(toRaw),
      amount: amountRaw,
      amountUnits,
      tokenSymbol: token.symbol,
      memo,
    },
    error: "",
  };
}

function PayPageContent() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();

  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [runtimeError, setRuntimeError] = useState("");

  const { request, error: requestError } = useMemo(
    () => parseRequestParams(searchParams),
    [searchParams],
  );

  const token = request ? getTokenBySymbol(request.tokenSymbol) : undefined;

  const {
    mutateAsync: transferSync,
    isPending,
    error,
  } = Hooks.token.useTransferSync();

  const transferErrorMessage = useMemo(() => {
    if (!error) {
      return "";
    }
    const message = error.message.toLowerCase();
    if (message.includes("rejected") || message.includes("denied")) {
      return "Payment cancelled in passkey confirmation.";
    }
    if (
      message.includes("insufficient") ||
      message.includes("sponsor") ||
      message.includes("fee")
    ) {
      return "Payment failed due to insufficient balance or sponsorship.";
    }
    if (
      message.includes("rpc") ||
      message.includes("network") ||
      message.includes("timeout")
    ) {
      return "Network is slow. Please retry.";
    }
    return error.message.split("\n")[0];
  }, [error]);

  const handlePayNow = async () => {
    if (!request || !token) {
      return;
    }

    setRuntimeError("");
    setTxHash(null);

    const memoBytes32 = request.memo
      ? pad(stringToHex(request.memo), { size: 32 })
      : pad("0x", { size: 32 });

    try {
      const response = await transferSync({
        token: token.address,
        to: request.to,
        amount: request.amountUnits,
        memo: memoBytes32,
      });

      const hash = response?.receipt?.transactionHash;
      if (!hash) {
        throw new Error("Transaction hash missing from response.");
      }

      setTxHash(hash);
      showSuccess("Payment sent", `${request.amount} ${request.tokenSymbol}`);

      if (address) {
        addTransferHistoryEntries([
          {
            id:
              typeof crypto !== "undefined" &&
              typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now()}`,
            transactionHash: hash,
            counterparty: request.to,
            amount: request.amountUnits,
            direction: "sent",
            createdAtMs: Date.now(),
          },
        ]);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Payment failed";
      if (message.includes("Transaction hash missing")) {
        setRuntimeError(message);
      }
      showError("Payment failed", message);
    }
  };

  const handleCopyHash = async () => {
    if (!txHash) {
      return;
    }

    await navigator.clipboard.writeText(txHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  if (!request || !token) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Invalid Payment Request</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[--status-error-text]">
              {requestError || "Malformed payment URL."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-10">
      <div className="mb-6">
        <h1 className="font-[--font-display] text-2xl font-bold tracking-tight text-[--text-primary]">
          Payment Request
        </h1>
        <p className="mt-1 text-sm text-[--text-secondary]">
          Review and pay this Tempo request.
        </p>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[--text-secondary]">Status</span>
            <StatusBadge
              status={isPending ? "pending" : txHash ? "success" : "scheduled"}
            />
          </div>

          <div className="rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] px-3 py-2">
            <p className="text-xs uppercase tracking-[0.16em] text-[--text-tertiary]">
              Amount
            </p>
            <p className="font-mono text-xl text-[--text-primary]">
              {request.amount} {token.symbol}
            </p>
            <p className="mt-1 text-xs text-[--text-secondary]">
              Raw units: {request.amountUnits.toString()}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[--text-tertiary]">
              Recipient
            </p>
            <p className="mt-1 break-all font-mono text-sm text-[--text-primary]">
              {request.to}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[--text-tertiary]">
              Memo
            </p>
            <p className="mt-1 text-sm text-[--text-primary]">
              {request.memo || "-"}
            </p>
          </div>

          {!isConnected ? (
            <div className="rounded-[--radius-md] border border-[--status-warning-border] bg-[--status-warning-bg] px-3 py-2">
              <p className="text-sm text-[--status-warning-text]">
                Connect Wallet to Pay
              </p>
              <Link
                href="/"
                className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-[--radius-md] border border-[--border-default] px-3 text-xs text-[--text-primary] hover:bg-[--bg-surface]"
              >
                <Wallet size={14} />
                Go to Wallet Connect
              </Link>
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => void handlePayNow()}
              disabled={isPending || !!txHash}
              loading={isPending}
            >
              {isPending ? "Paying..." : txHash ? "Payment Sent ✓" : "Pay Now"}
            </Button>
          )}

          {transferErrorMessage ? (
            <p className="rounded-[--radius-md] border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-sm text-[--status-error-text]">
              {transferErrorMessage}
            </p>
          ) : null}

          {runtimeError ? (
            <p className="rounded-[--radius-md] border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-sm text-[--status-error-text]">
              {runtimeError}
            </p>
          ) : null}

          {txHash ? (
            <div className="space-y-2 rounded-[--radius-md] border border-[--status-success-border] bg-[--status-success-bg] p-3">
              <p className="inline-flex items-center gap-1.5 text-sm text-[--status-success-text]">
                <CheckCircle size={14} />
                Payment confirmed
              </p>
              <p className="break-all font-mono text-xs text-[--text-secondary]">
                {txHash}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleCopyHash()}
                >
                  <Copy size={12} />
                  {copied ? "Copied" : "Copy Hash"}
                </Button>
                <Link
                  href={`${EXPLORER_URL}/tx/${txHash}`}
                  target="_blank"
                  className="inline-flex h-8 items-center rounded-[--radius-md] border border-[--border-default] px-3 text-xs text-[--text-primary] hover:bg-[--bg-subtle]"
                >
                  View on Explorer
                </Link>
              </div>
            </div>
          ) : null}

          <p className="text-xs text-[--text-secondary]">
            Memo reconciliation: this payment submits memo as bytes32 so
            on-chain records match the request.
          </p>
          <p className="text-xs text-[--text-secondary]">
            Display amount: {formatUnits(request.amountUnits, token.decimals)}{" "}
            {token.symbol}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Loading Request</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[--text-secondary]">
                Reading payment link parameters...
              </p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <PayPageContent />
    </Suspense>
  );
}
