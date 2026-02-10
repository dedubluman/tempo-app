"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { isAddress, getAddress, parseUnits, stringToHex, pad } from "viem";
import { PATHUSD_ADDRESS, PATHUSD_DECIMALS, EXPLORER_URL } from "@/lib/constants";
import { pathUsdAbi } from "@/lib/abi";
import Link from "next/link";

export function TransferForm() {
  const { address } = useAccount();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [recipientError, setRecipientError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [memoError, setMemoError] = useState("");
  const [copiedHash, setCopiedHash] = useState(false);

  const { data: balance } = useReadContract({
    address: PATHUSD_ADDRESS,
    abi: pathUsdAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const {
    mutateAsync: transferSync,
    data: transferResult,
    isPending,
    error: transferError,
    reset,
  } = Hooks.token.useTransferSync();

  const validateRecipient = (value: string): boolean => {
    if (!value) {
      setRecipientError("Recipient address required");
      return false;
    }
    if (!isAddress(value)) {
      setRecipientError("Invalid address format");
      return false;
    }
    const checksummed = getAddress(value);
    if (checksummed === "0x0000000000000000000000000000000000000000") {
      setRecipientError("Cannot send to zero address");
      return false;
    }
    setRecipientError("");
    return true;
  };

  const validateAmount = (value: string): boolean => {
    if (!value) {
      setAmountError("Amount required");
      return false;
    }
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      setAmountError("Amount must be greater than 0");
      return false;
    }
    const decimalPart = value.split(".")[1];
    if (decimalPart && decimalPart.length > PATHUSD_DECIMALS) {
      setAmountError(`Max ${PATHUSD_DECIMALS} decimal places`);
      return false;
    }
    try {
      if (balance) {
        const amountInUnits = parseUnits(value, PATHUSD_DECIMALS);
        if (amountInUnits > balance) {
          setAmountError("Insufficient balance");
          return false;
        }
      }
    } catch {
      setAmountError("Invalid amount format");
      return false;
    }
    setAmountError("");
    return true;
  };

  const validateMemo = (value: string): boolean => {
    const byteLength = new TextEncoder().encode(value).length;
    if (byteLength > 32) {
      setMemoError("Memo exceeds 32 bytes");
      return false;
    }
    setMemoError("");
    return true;
  };

  const hash = transferResult?.receipt.transactionHash;
  const isSuccess = Boolean(hash);
  const memoByteLength = new TextEncoder().encode(memo).length;
  const memoRemaining = 32 - memoByteLength;
  const shortHash = useMemo(() => (hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : ""), [hash]);

  const inputBaseClass =
    "h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isRecipientValid = validateRecipient(recipient);
    const isAmountValid = validateAmount(amount);
    const isMemoValid = validateMemo(memo);

    if (!isRecipientValid || !isAmountValid || !isMemoValid) {
      return;
    }

    const checksummedRecipient = getAddress(recipient);
    const amountInUnits = parseUnits(amount, PATHUSD_DECIMALS);
    const memoBytes32 = memo ? pad(stringToHex(memo), { size: 32 }) : pad("0x", { size: 32 });

    try {
      await transferSync({
        token: PATHUSD_ADDRESS,
        to: checksummedRecipient,
        amount: amountInUnits,
        memo: memoBytes32,
      });
    } catch {
      // Hook state already exposes the error.
    }
  };

  const handleReset = () => {
    setRecipient("");
    setAmount("");
    setMemo("");
    setRecipientError("");
    setAmountError("");
    setMemoError("");
    reset();
  };

  const handleCopyHash = async () => {
    if (!hash) return;
    await navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    window.setTimeout(() => setCopiedHash(false), 1200);
  };

  if (isSuccess && hash) {
    return (
      <div className="space-y-5 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-emerald-100/50 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Transfer Successful
          </p>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Transaction</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm text-emerald-800" title={hash}>
                {shortHash}
              </p>
              <button
                type="button"
                className="inline-flex h-8 items-center rounded-lg border border-emerald-300 bg-white px-2 text-xs font-medium text-emerald-800 transition-colors duration-150 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
                onClick={() => void handleCopyHash()}
              >
                {copiedHash ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/tx/${hash}`}
              className="inline-flex h-9 items-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-800 transition-colors duration-150 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            >
              View Details
            </Link>
            <a
              href={`${EXPLORER_URL}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-800 transition-colors duration-150 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            >
              Explorer
            </a>
          </div>
        </div>
        <button
          className="h-11 w-full rounded-xl border border-emerald-300 bg-white text-sm font-semibold text-emerald-800 transition-all duration-200 hover:bg-emerald-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
          onClick={handleReset}
          type="button"
        >
          Send Another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Send pathUSD
        </p>
        <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
          Gas sponsored
        </span>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 border-t border-slate-200 pt-4 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="recipient" className="text-sm font-medium text-slate-900">
            Recipient Address
          </label>
          <input
            id="recipient"
            type="text"
            className={`${inputBaseClass} ${recipientError ? "border-rose-300 focus-visible:ring-rose-300/50" : "border-slate-300"}`}
            placeholder="0x..."
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              validateRecipient(e.target.value);
            }}
            disabled={isPending}
          />
          {recipientError && <p className="text-xs text-rose-700">{recipientError}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="amount" className="text-sm font-medium text-slate-900">
            Amount
          </label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            className={`${inputBaseClass} ${amountError ? "border-rose-300 focus-visible:ring-rose-300/50" : "border-slate-300"}`}
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const input = e.target.value;
              const [whole, fractional = ""] = input.split(".");
              const normalized =
                fractional.length > PATHUSD_DECIMALS
                  ? `${whole}.${fractional.slice(0, PATHUSD_DECIMALS)}`
                  : input;
              setAmount(normalized);
              validateAmount(normalized);
            }}
            disabled={isPending}
          />
          {amountError && <p className="text-xs text-rose-700">{amountError}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="memo" className="text-sm font-medium text-slate-900">
            Memo (optional)
          </label>
          <input
            id="memo"
            type="text"
            className={`${inputBaseClass} ${memoError ? "border-rose-300 focus-visible:ring-rose-300/50" : "border-slate-300"}`}
            placeholder="Payment for..."
            value={memo}
            onChange={(e) => {
              setMemo(e.target.value);
              validateMemo(e.target.value);
            }}
            disabled={isPending}
          />
          <p className={`text-xs ${memoRemaining < 0 ? "text-rose-700" : memoRemaining <= 6 ? "text-amber-700" : "text-slate-500"}`}>
            {memoByteLength}/32 bytes
          </p>
          {memoError && <p className="text-xs text-rose-700">{memoError}</p>}
        </div>

        {transferError && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 md:col-span-2">
            {transferError.message.split("\n")[0]}
          </p>
        )}

        <button
          type="submit"
          className="h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 md:col-span-2"
          disabled={isPending}
        >
          {isPending ? "Processing..." : "Send"}
        </button>
        <p className="text-xs text-slate-500 md:col-span-2">
          Network fees are sponsored during testnet usage.
        </p>
      </form>
    </div>
  );
}
