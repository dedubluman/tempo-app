"use client";

import dynamic from "next/dynamic";
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

const ThreeHeroScene = dynamic(
  () => import("@/components/ui/ThreeHeroScene"),
  { ssr: false }
);

export default function Home() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div data-page="landing" className="min-h-screen bg-[--bg-base] text-[--text-primary]">
      <LandingNav onAuthClick={() => setAuthOpen(true)} />

      <main>
        <section className="relative overflow-hidden">
          <ThreeHeroScene />
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
