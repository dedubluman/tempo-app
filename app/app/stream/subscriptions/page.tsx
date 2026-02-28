"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Stop, Clock, Trash } from "@phosphor-icons/react";
import { isAddress } from "viem";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TokenSelector } from "@/components/ui/TokenSelector";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { FeatureGate } from "@/components/ui/FeatureGate";
import { FeatureFlag } from "@/lib/featureFlags";
import {
  useSubscriptionStore,
  type SubscriptionFrequency,
} from "@/lib/subscriptionStore";
import type { TokenInfo } from "@/types/token";

const FREQUENCIES: { label: string; value: SubscriptionFrequency }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

export default function SubscriptionsPage() {
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const addSubscription = useSubscriptionStore((s) => s.addSubscription);
  const cancelSubscription = useSubscriptionStore((s) => s.cancelSubscription);

  const [showCreate, setShowCreate] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<SubscriptionFrequency>("weekly");
  const [selectedToken, setSelectedToken] = useState<TokenInfo>(TOKEN_REGISTRY[0]);
  const [error, setError] = useState("");

  const handleCreate = () => {
    setError("");
    if (!recipient || !isAddress(recipient)) {
      setError("Enter a valid recipient address");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }

    const freqMs: Record<SubscriptionFrequency, number> = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };

    addSubscription({
      recipient,
      tokenAddress: selectedToken.address,
      tokenSymbol: selectedToken.symbol,
      amount,
      frequency,
      nextPaymentAt: Date.now() + freqMs[frequency],
      active: true,
    });

    setRecipient("");
    setAmount("");
    setShowCreate(false);
  };

  const activeCount = subscriptions.filter((s) => s.active).length;

  return (
    <FeatureGate flag={FeatureFlag.STREAMING_SUBSCRIPTIONS}>
      <div className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/app/stream" className="flex items-center gap-1 text-sm text-[--text-secondary] hover:text-[--text-primary]">
            <ArrowLeft size={16} />
            Back to Streaming
          </Link>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-[--font-display] text-2xl text-[--text-primary]">
              <Clock size={24} className="mr-2 inline-block" weight="duotone" />
              Subscriptions
            </h1>
            <p className="mt-1 text-sm text-[--text-secondary]">
              {activeCount} active subscription{activeCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Button type="button" onClick={() => setShowCreate(!showCreate)}>
            <Plus size={14} />
            New Subscription
          </Button>
        </div>

        {showCreate && (
          <Card variant="elevated" className="mb-5">
            <CardHeader>
              <CardTitle>Create Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Recipient Address"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              <TokenSelector selectedToken={selectedToken} onSelect={setSelectedToken} />
              <Input
                label="Amount per payment"
                type="number"
                placeholder="10.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div>
                <label className="mb-1 block text-xs text-[--text-tertiary]">Frequency</label>
                <div className="flex gap-2">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFrequency(f.value)}
                      className={`rounded-[--radius-md] border px-3 py-1.5 text-xs transition-colors ${
                        frequency === f.value
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                          : "border-[--border-default] text-[--text-secondary] hover:bg-[--bg-subtle]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-[--status-error-text]">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" onClick={handleCreate}>Create</Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {subscriptions.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="py-12 text-center">
              <Clock size={48} className="mx-auto mb-3 text-[--text-tertiary]" weight="thin" />
              <p className="text-sm text-[--text-secondary]">
                No subscriptions yet. Create one to schedule recurring payments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <Card key={sub.id} variant="elevated">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-mono text-sm text-[--text-primary]">
                      {sub.amount} {sub.tokenSymbol} / {sub.frequency}
                    </p>
                    <p className="text-xs text-[--text-secondary]">
                      To: {sub.recipient.slice(0, 8)}...{sub.recipient.slice(-4)}
                    </p>
                    <p className="text-xs text-[--text-tertiary]">
                      {sub.active
                        ? `Next: ${new Date(sub.nextPaymentAt).toLocaleDateString()}`
                        : "Cancelled"}
                      {" | "}{sub.paymentCount} payments ({sub.totalPaid} total)
                    </p>
                  </div>
                  {sub.active && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => cancelSubscription(sub.id)}
                    >
                      <Stop size={12} />
                      Cancel
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
