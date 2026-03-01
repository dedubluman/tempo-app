"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  PaperPlaneTiltIcon,
  RobotIcon,
  TrashIcon,
  WarningIcon,
  ArrowSquareOutIcon,
  ShieldCheckIcon,
  SpinnerIcon,
} from "@phosphor-icons/react";
import { useAccount } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { parseUnits } from "viem";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { EXPLORER_URL } from "@/lib/constants";
import { dismissToast, showError, showLoading, showSuccess } from "@/lib/toast";
import { useAgentChat } from "@/hooks/useAgentChat";
import type { ChatMessage } from "@/lib/ai/types";

const MAX_INPUT_LENGTH = 500;

function prettyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied")) return "Action cancelled in passkey confirmation.";
  if (lower.includes("insufficient") || lower.includes("fee")) return "Insufficient balance or fee sponsorship issue.";
  if (lower.includes("timeout") || lower.includes("network")) return "Network issue. Please retry.";
  return message.split("\n")[0] || "Operation failed";
}

export default function AgentPage() {
  const { address } = useAccount();
  const { messages, isProcessing, sendMessage, updateMessageTxHash, clearHistory } = useAgentChat();
  const { balances, refetch: refetchBalances } = useTokenBalances();
  const { mutateAsync: transferSync, isPending: isTransferring } = Hooks.token.useTransferSync();

  const [userInput, setUserInput] = useState("");
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = userInput.trim();
    if (!text || isProcessing) return;

    setUserInput("");
    const intent = await sendMessage(text);
    if (intent?.action === "balance") {
      void refetchBalances();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleConfirmTransfer = async (msg: ChatMessage) => {
    if (!msg.intent || msg.intent.action !== "transfer" || !msg.intent.recipient || !msg.intent.amount) return;

    const tokenSymbol = msg.intent.token || "pathUSD";
    const tokenInfo = TOKEN_REGISTRY.find((t) => t.symbol.toLowerCase() === tokenSymbol.toLowerCase()) ?? TOKEN_REGISTRY[0];

    setPendingConfirmId(msg.id);
    const loadingId = showLoading("Executing transfer...");

    try {
      const mockTransferResult =
        typeof window !== "undefined"
          ? (
              window as Window & {
                __MOCK_TRANSFER_RESULT__?: { hash?: string; status?: "success" | "error" };
              }
            ).__MOCK_TRANSFER_RESULT__
          : undefined;

      if (
        mockTransferResult?.status === "success" &&
        typeof mockTransferResult.hash === "string" &&
        /^0x[a-fA-F0-9]{64}$/.test(mockTransferResult.hash)
      ) {
        updateMessageTxHash(msg.id, mockTransferResult.hash);
        showSuccess("Transfer executed", `Tx: ${mockTransferResult.hash.slice(0, 10)}...`);
        void refetchBalances();
        return;
      }

      const response = await transferSync({
        token: tokenInfo.address as `0x${string}`,
        to: msg.intent.recipient as `0x${string}`,
        amount: parseUnits(msg.intent.amount, 6),
      });

      const hash = response?.receipt?.transactionHash;
      if (!hash) throw new Error("Transfer completed but hash missing.");

      updateMessageTxHash(msg.id, hash);
      showSuccess("Transfer executed", `Tx: ${hash.slice(0, 10)}...`);
      void refetchBalances();
    } catch (error) {
      showError("Transfer failed", prettyError(error));
    } finally {
      setPendingConfirmId(null);
      dismissToast(loadingId);
    }
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RobotIcon size={22} weight="duotone" className="text-[--text-primary]" />
          <h1 className="font-[--font-display] text-xl text-[--text-primary]">AI Agent</h1>
          <span className="rounded-full bg-[--status-success-bg] px-2 py-0.5 text-[10px] font-medium text-[--status-success-text]">
            Gemini
          </span>
        </div>
        <div className="flex items-center gap-2">
          {address && (
            <span className="hidden text-xs text-[--text-tertiary] sm:block">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )}
          {messages.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearHistory} title="Clear chat">
              <TrashIcon size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <Card variant="elevated" className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {/* Welcome */}
          {showWelcome && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[--bg-subtle]">
                <RobotIcon size={28} weight="duotone" className="text-[--text-secondary]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-[--text-primary]">Payment Assistant</p>
                <p className="max-w-sm text-xs text-[--text-tertiary]">
                  Describe your payment intent in natural language. I&apos;ll parse it and ask for your confirmation before executing.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Send 5 pathUSD to 0x...",
                  "Check my balance",
                  "Transfer 10 AlphaUSD to 0x...",
                ].map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => setUserInput(cmd)}
                    className="rounded-lg border border-[--border-subtle] bg-[--bg-subtle] px-3 py-1.5 text-xs text-[--text-secondary] transition-colors hover:border-[--border-default] hover:bg-[--bg-elevated]"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[--text-tertiary]">
                <ShieldCheckIcon size={12} />
                <span>Every transaction requires your passkey confirmation</span>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  balances={balances}
                  isTransferring={isTransferring && pendingConfirmId === msg.id}
                  onConfirm={() => void handleConfirmTransfer(msg)}
                />
              ))}
              {isProcessing && (
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[--bg-subtle]">
                    <RobotIcon size={14} className="text-[--text-secondary]" />
                  </div>
                  <div className="rounded-xl rounded-tl-sm bg-[--bg-subtle] px-3 py-2">
                    <SpinnerIcon size={16} className="animate-spin text-[--text-tertiary]" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <CardContent className="border-t border-[--border-subtle] p-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder='Try: "Send 5 pathUSD to 0x..."'
              value={userInput}
              onChange={(e) => setUserInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
              onKeyDown={handleKeyDown}
              disabled={isProcessing || isTransferring}
              className="h-10 flex-1 rounded-[--radius-md] border border-[--border-default] bg-[--bg-surface] px-3 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none disabled:opacity-50"
            />
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={isProcessing || !userInput.trim() || isTransferring}
              loading={isProcessing}
              size="md"
              className="shrink-0"
            >
              <PaperPlaneTiltIcon size={16} />
            </Button>
          </div>
          <p className="mt-1 text-right text-[10px] text-[--text-tertiary]">
            {userInput.length}/{MAX_INPUT_LENGTH}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Message Bubble ---

interface MessageBubbleProps {
  message: ChatMessage;
  balances: Array<{ token: { symbol: string; address: string }; formatted: string }>;
  isTransferring: boolean;
  onConfirm: () => void;
}

function MessageBubble({ message, balances, isTransferring, onConfirm }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-xl rounded-br-sm px-3 py-2 text-sm text-white" style={{ background: "var(--gradient-flux)" }}>
          {message.content}
        </div>
      </div>
    );
  }

  const intent = message.intent;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[--bg-subtle]">
        <RobotIcon size={14} className="text-[--text-secondary]" />
      </div>
      <div className="max-w-[85%] space-y-2">
        {/* Transfer Intent */}
        {intent?.action === "transfer" && (
          <div className="rounded-xl rounded-tl-sm border border-[--border-subtle] bg-[--bg-subtle] p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[--text-tertiary]">Transfer Intent</p>
            <div className="space-y-1.5">
              <Row label="Recipient" value={`${intent.recipient?.slice(0, 8)}...${intent.recipient?.slice(-6)}`} mono />
              <Row label="Amount" value={`${intent.amount} ${intent.token || "pathUSD"}`} highlight />
              {intent.memo && <Row label="Memo" value={intent.memo} />}
              <Row label="Gas" value="Sponsored ✓" success />
            </div>

            {/* Tx Hash (post-execution) */}
            {message.txHash ? (
              <div className="mt-3 rounded-lg border border-[--status-success-border] bg-[--status-success-bg] p-2">
                <p className="flex items-center gap-1 text-xs text-[--status-success-text]">
                  <CheckCircleIcon size={12} weight="bold" /> Transfer executed
                </p>
                <p className="mt-1 break-all font-mono text-[10px] text-[--text-tertiary]">{message.txHash}</p>
                <Link
                  href={`${EXPLORER_URL}/tx/${message.txHash}`}
                  target="_blank"
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-[--text-secondary] hover:text-[--text-primary]"
                >
                  View on Explorer <ArrowSquareOutIcon size={10} />
                </Link>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" onClick={onConfirm} loading={isTransferring} disabled={isTransferring}>
                  <CheckCircleIcon size={12} />
                  Confirm & Execute
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={isTransferring}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Balance */}
        {intent?.action === "balance" && (
          <div className="w-fit min-w-[240px] rounded-xl rounded-tl-sm border border-[--border-subtle] bg-[--bg-subtle] p-3 px-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[--text-tertiary]">Balances</p>
            <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-1">
              {balances.map((b) => (
                <Fragment key={b.token.address}>
                  <span className="text-xs text-[--text-secondary]">{b.token.symbol}</span>
                  <span className="whitespace-nowrap text-right font-mono text-xs tabular-nums text-[--text-primary]">{b.formatted}</span>
                </Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Unknown / Error */}
        {intent?.action === "unknown" && (
          <div className="rounded-xl rounded-tl-sm border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2">
            <p className="flex items-center gap-1 text-xs text-[--status-error-text]">
              <WarningIcon size={12} />
              {intent.error || "I couldn't understand that. Try: \"Send 5 pathUSD to 0x...\""}
            </p>
          </div>
        )}

        {/* Fallback text (no intent) */}
        {!intent && (
          <div className="rounded-xl rounded-tl-sm bg-[--bg-subtle] px-3 py-2 text-sm text-[--text-primary]">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper ---

function Row({ label, value, mono, highlight, success }: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[--text-tertiary]">{label}</span>
      <span
        className={`text-xs ${mono ? "font-mono" : ""} ${highlight ? "font-medium text-[--text-primary]" : ""} ${success ? "text-[--status-success-text]" : "text-[--text-secondary]"}`}
      >
        {value}
      </span>
    </div>
  );
}
