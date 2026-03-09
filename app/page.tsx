"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingMetrics } from "@/components/landing/LandingMetrics";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingSecurity } from "@/components/landing/LandingSecurity";
import { LandingCommunity } from "@/components/landing/LandingCommunity";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AuthSheet } from "@/components/wallet/AuthSheet";
import { MeshGradient } from "@/components/ui/MeshGradient";

export default function Home() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[--bg-base] text-[--text-primary]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[--brand-primary] focus:text-[--brand-contrast] focus:rounded-lg"
      >
        Skip to content
      </a>

      <LandingNav onAuthClick={() => setAuthOpen(true)} />

      <main id="main-content">
        <section className="relative overflow-hidden">
          <MeshGradient />
          <div className="relative z-10">
            <LandingHero onAuthClick={() => setAuthOpen(true)} />
          </div>
        </section>
        <LandingMetrics />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingSecurity />
        <LandingCommunity />
      </main>

      <LandingFooter />

      <AuthSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.push("/app")}
      />
    </div>
  );
}
