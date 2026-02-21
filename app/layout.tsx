import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider, themeScript } from "@/components/ui/ThemeProvider";
import { Toaster } from "sonner";

const satoshi = localFont({
  src: [
    { path: "../public/fonts/satoshi/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

const satoshiDisplay = localFont({
  src: [
    { path: "../public/fonts/satoshi/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "../public/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fluxus — Instant Stablecoin Payments",
  description:
    "Gasless pathUSD transfers with Passkey authentication. Zero passwords. Zero gas fees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${satoshi.variable} ${satoshiDisplay.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-[--bg-base] text-[--text-primary] antialiased">
        <Providers>
          <ThemeProvider>
            {children}
            <Toaster position="bottom-center" richColors />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
