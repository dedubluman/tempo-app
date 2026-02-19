import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider, themeScript } from "@/components/ui/ThemeProvider";
import { Toaster } from "sonner";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
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
      className={`${GeistSans.variable} ${manrope.variable} ${GeistMono.variable}`}
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
