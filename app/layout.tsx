import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider, themeScript } from "@/components/ui/ThemeProvider";
import { OfflineBanner } from "@/components/OfflineBanner";
import { FeatureFlag, isFeatureEnabled } from "@/lib/featureFlags";
import { Toaster } from "sonner";


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
      className={`${GeistSans.variable} ${GeistMono.variable}`}
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[--brand-primary] focus:px-4 focus:py-2 focus:text-[--brand-contrast] focus:outline-none"
        >
          Skip to content
        </a>
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
