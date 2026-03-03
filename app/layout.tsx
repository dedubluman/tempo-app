import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider, themeScript } from "@/components/ui/ThemeProvider";
import { OfflineBanner } from "@/components/OfflineBanner";
import { FeatureFlag, isFeatureEnabled } from "@/lib/featureFlags";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  const offlineModeEnabled = isFeatureEnabled(FeatureFlag.OFFLINE_MODE);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${satoshi.variable} ${satoshiDisplay.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {offlineModeEnabled ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `if (typeof window !== "undefined" && "serviceWorker" in navigator) { window.addEventListener("load", function() { navigator.serviceWorker.register("/sw.js").catch(function(error) { console.error("[PWA] Service worker registration failed", error); }); }); }`,
            }}
          />
        ) : null}
      </head>
      <body className="bg-[--bg-base] text-[--text-primary] antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <ThemeProvider>
              {children}
              <OfflineBanner />
              <Toaster position="bottom-center" richColors />
            </ThemeProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
