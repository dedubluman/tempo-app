"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Export, Trash, Receipt } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useMerchantStore } from "@/lib/merchantStore";
import { EXPLORER_URL } from "@/lib/constants";

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

function exportCSV(receipts: { amount: string; token: string; sender: string; txHash: string; timestamp: number; memo: string }[]) {
  const header = "Date,Amount,Token,Sender,TxHash,Memo";
  const rows = receipts.map((r) =>
    [
      new Date(r.timestamp).toISOString(),
      r.amount,
      r.token,
      r.sender,
      r.txHash,
      `"${r.memo.replace(/"/g, '""')}"`,
    ].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `fluxus-receipts-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReceiptHistoryPage() {
  const receipts = useMerchantStore((s) => s.receipts);
  const clearReceipts = useMerchantStore((s) => s.clearReceipts);
  const [clearing, setClearing] = useState(false);

  const handleClear = () => {
    if (window.confirm("Clear all receipts? This cannot be undone.")) {
      clearReceipts();
      setClearing(true);
      setTimeout(() => setClearing(false), 1500);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/app/pos"
          className="flex items-center gap-1 text-sm text-[--text-secondary] hover:text-[--text-primary]"
        >
          <ArrowLeft size={16} />
          Back to POS
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[--font-display] text-2xl text-[--text-primary]">
            <Receipt size={24} className="mr-2 inline-block" weight="duotone" />
            Receipt History
          </h1>
          <p className="mt-1 text-sm text-[--text-secondary]">
            {receipts.length} receipt{receipts.length !== 1 ? "s" : ""} stored locally
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => exportCSV(receipts)}
            disabled={receipts.length === 0}
          >
            <Export size={14} />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClear}
            disabled={receipts.length === 0 || clearing}
          >
            <Trash size={14} />
            {clearing ? "Cleared" : "Clear All"}
          </Button>
        </div>
      </div>

      {receipts.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="py-12 text-center">
            <Receipt size={48} className="mx-auto mb-3 text-[--text-tertiary]" weight="thin" />
            <p className="text-sm text-[--text-secondary]">
              No receipts yet. Complete a POS payment to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[--border-subtle] text-xs text-[--text-tertiary]">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Token</th>
                    <th className="pb-2 pr-4 font-medium">Sender</th>
                    <th className="pb-2 pr-4 font-medium">Tx Hash</th>
                    <th className="pb-2 font-medium">Memo</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-[--border-subtle] last:border-0"
                    >
                      <td className="py-2.5 pr-4 text-[--text-secondary]">
                        {formatDate(r.timestamp)}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-[--text-primary]">
                        {r.amount}
                      </td>
                      <td className="py-2.5 pr-4 text-[--text-secondary]">
                        {r.token}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-[--text-secondary]">
                        {truncateAddress(r.sender)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`${EXPLORER_URL}/tx/${r.txHash}`}
                          target="_blank"
                          className="font-mono text-amber-400 underline"
                        >
                          {truncateAddress(r.txHash)}
                        </Link>
                      </td>
                      <td className="py-2.5 text-[--text-tertiary]">
                        {r.memo || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
