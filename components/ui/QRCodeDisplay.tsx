"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/cn";

type QRCodeDisplayProps = {
  data: string;
  size?: number;
  className?: string;
};

export function QRCodeDisplay({ data, size = 200, className }: QRCodeDisplayProps) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      const output = await QRCode.toString(data, {
        type: "svg",
        margin: 1,
        width: size,
      });

      if (!cancelled) {
        setSvg(output);
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [data, size]);

  return (
    <div
      className={cn("inline-block rounded-[--radius-md] bg-white p-2", className)}
      style={{ width: size + 16, height: size + 16 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
