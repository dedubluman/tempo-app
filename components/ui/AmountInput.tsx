"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { TokenInfo } from "@/types/token";

type AmountInputProps = {
  value: string;
  onChange: (value: string) => void;
  token: TokenInfo;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
};

function clampToDecimals(value: string, decimals: number): string {
  const sanitized = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const [whole = "", fraction = ""] = sanitized.split(".");
  const wholeNormalized = whole.replace(/^0+(?=\d)/, "");

  if (sanitized.includes(".")) {
    return `${wholeNormalized || "0"}.${fraction.slice(0, decimals)}`;
  }

  return wholeNormalized;
}

export function AmountInput({
  value,
  onChange,
  token,
  max,
  placeholder = "0.00",
  disabled,
}: AmountInputProps) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(clampToDecimals(event.target.value, 6))}
      placeholder={placeholder}
      inputMode="decimal"
      disabled={disabled}
      rightElement={
        <div className="flex items-center gap-2">
          {max ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onChange(max)}
              disabled={disabled}
            >
              Max
            </Button>
          ) : null}
          <span className="text-xs text-[--text-secondary]">{token.symbol}</span>
        </div>
      }
    />
  );
}
