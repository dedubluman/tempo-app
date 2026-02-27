"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Copy, ShareNetwork } from "@phosphor-icons/react";
import { getAddress, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { RecentRequests, type RequestHistoryEntry } from "@/components/request/RecentRequests";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";
import { TokenSelector } from "@/components/ui/TokenSelector";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { dismissToast, showError, showLoading, showSuccess } from "@/lib/toast";

const STORAGE_KEY = "tempo.requestHistory.v1";
const MAX_HISTORY = 20;

export default function RequestPage() {
  const { address, isConnected } = useAccount();

  const [recipient, setRecipient] = useState("");
  const [selectedToken, setSelectedToken] = useState(TOKEN_REGISTRY[0]);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<RequestHistoryEntry[]>([]);

  const [recipientError, setRecipientError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [memoError, setMemoError] = useState("");

  useEffect(() => {
    if (!address) {
      return;
    }
    setRecipient((current) => (current ? current : address));
  }, [address]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as RequestHistoryEntry[];
      setHistory(Array.isArray(parsed) ? parsed : []);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    }
  }, []);

  const memoRemaining = useMemo(() => 32 - new TextEncoder().encode(memo).length, [memo]);

  const persistHistory = (entries: RequestHistoryEntry[]) => {
    setHistory(entries);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  };

  const validate = (): boolean => {
    let ok = true;

    if (!recipient) {
      setRecipientError("Recipient address required");
      ok = false;
    } else if (!isAddress(recipient)) {
      setRecipientError("Invalid address format");
      ok = false;
    } else {
      setRecipientError("");
    }

    if (!amount) {
      setAmountError("Amount required");
      ok = false;
    } else {
      try {
        const amountUnits = parseUnits(amount, selectedToken.decimals);
        if (amountUnits <= BigInt(0)) {
          setAmountError("Amount must be greater than 0");
          ok = false;
        } else {
          setAmountError("");
        }
      } catch {
        setAmountError("Invalid amount format");
        ok = false;
      }
    }

    if (memoRemaining < 0) {
      setMemoError("Memo exceeds 32 bytes");
      ok = false;
    } else {
      setMemoError("");
    }

    return ok;
  };

  const handleCreateRequest = () => {
    if (!validate()) {
      return;
    }

    const checksummedRecipient = getAddress(recipient);
    const params = new URLSearchParams({
      to: checksummedRecipient,
      amount,
      token: selectedToken.symbol,
    });

    const trimmedMemo = memo.trim();
    if (trimmedMemo) {
      params.set("memo", trimmedMemo);
    }

    const relativeUrl = `/pay?${params.toString()}`;
    const fullUrl =
      typeof window !== "undefined" ? `${window.location.origin}${relativeUrl}` : relativeUrl;

    setGeneratedUrl(fullUrl);

    const nextEntry: RequestHistoryEntry = {
      id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
      to: checksummedRecipient,
      amount,
      token: selectedToken.symbol,
      memo: trimmedMemo,
      url: fullUrl,
      createdAtMs: Date.now(),
    };

    const nextHistory = [nextEntry, ...history].slice(0, MAX_HISTORY);
    persistHistory(nextHistory);
    showSuccess("Payment request created", `${amount} ${selectedToken.symbol}`);
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
      showSuccess("Link copied");
    } catch {
      showError("Copy failed", "Clipboard permissions are unavailable.");
    }
  };

  const handleShare = async () => {
    if (!generatedUrl) {
      return;
    }

    if (typeof navigator === "undefined" || !("share" in navigator)) {
      await handleCopy(generatedUrl);
      return;
    }

    const loadingId = showLoading("Opening share sheet...");
    try {
      await navigator.share({
        title: "Tempo Payment Request",
        text: `Pay ${amount} ${selectedToken.symbol}`,
        url: generatedUrl,
      });
      showSuccess("Request shared");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Share cancelled";
      showError("Share cancelled", message);
    } finally {
      dismissToast(loadingId);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="font-[--font-display] text-2xl text-[--text-primary]">Request</h1>
        <p className="mt-1 text-sm text-[--text-secondary]">Create shareable payment links with memo reconciliation.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Create Payment Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <p className="rounded-[--radius-md] border border-[--status-warning-border] bg-[--status-warning-bg] px-3 py-2 text-sm text-[--status-warning-text]">
                Connect your wallet to auto-fill recipient address.
              </p>
            ) : null}

            <Input
              label="Recipient"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="0x..."
              error={recipientError}
            />

            <div className="space-y-1">
              <p className="text-sm font-medium text-[--text-secondary]">Token</p>
              <TokenSelector
                selectedToken={selectedToken}
                onSelect={(token) => {
                  setSelectedToken(token);
                  setAmountError("");
                }}
              />
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-[--text-secondary]">Amount</p>
              <AmountInput
                value={amount}
                onChange={(value) => setAmount(value)}
                token={selectedToken}
                placeholder="0.00"
              />
              {amountError ? <p className="mt-1 text-sm text-[--status-error-text]">{amountError}</p> : null}
            </div>

            <Input
              label="Memo (optional)"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="invoice-123"
              error={memoError}
              helperText={`${memoRemaining} bytes remaining`}
            />

            <Button type="button" onClick={handleCreateRequest}>
              Create Request
            </Button>

            {generatedUrl ? (
              <div className="space-y-3 rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] p-3">
                <p className="inline-flex items-center gap-1.5 text-sm text-[--status-success-text]">
                  <CheckCircle size={14} />
                  Request ready to share
                </p>
                <div className="overflow-x-auto rounded-[--radius-sm] bg-white p-2">
                  <QRCodeDisplay data={generatedUrl} size={200} />
                </div>
                <p className="break-all font-mono text-xs text-[--text-secondary]">{generatedUrl}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => void handleCopy(generatedUrl)}>
                    <Copy size={12} />
                    {copied ? "Copied" : "Copy Link"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void handleShare()}>
                    <ShareNetwork size={12} />
                    Share
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentRequests entries={history} onCopy={handleCopy} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
