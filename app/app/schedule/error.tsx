"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Warning } from "@phosphor-icons/react";
import { prettyError } from "@/lib/errorUtils";

export default function ScheduleError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[--radius-2xl] bg-[--status-error-bg] text-[--status-error-text]">
        <Warning size={28} />
      </div>
      <div className="space-y-2">
        <h1 className="font-[--font-display] text-xl font-bold text-[--text-primary]">Scheduling Error</h1>
        <p className="text-sm text-[--text-secondary]">{prettyError(error)}</p>
      </div>
      <div className="flex w-full gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => reset()}>Try Again</Button>
        <Link href="/app" className="flex-1"><Button className="w-full">Go to Dashboard</Button></Link>
      </div>
    </div>
  );
}
