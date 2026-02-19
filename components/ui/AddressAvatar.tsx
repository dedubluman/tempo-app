"use client";

import { cn } from "@/lib/cn";

interface AddressAvatarProps {
  address: string;
  size?: "sm" | "md" | "lg";
  label?: boolean;
  className?: string;
}

function addressToColors(address: string): [string, string] {
  const hex = address.toLowerCase().replace("0x", "");
  const h1 = parseInt(hex.slice(0, 4), 16) % 360;
  const h2 = (h1 + 137) % 360;
  return [
    `hsl(${h1}, 70%, 60%)`,
    `hsl(${h2}, 70%, 55%)`,
  ];
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const sizeMap = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-12 h-12 text-sm",
};

export function AddressAvatar({ address, size = "md", label, className }: AddressAvatarProps) {
  const [color1, color2] = addressToColors(address);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn("rounded-full flex-shrink-0", sizeMap[size])}
        style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}
        title={address}
        aria-label={truncateAddress(address)}
      />
      {label && (
        <span className="text-xs text-[--text-tertiary] font-mono">
          {truncateAddress(address)}
        </span>
      )}
    </div>
  );
}
