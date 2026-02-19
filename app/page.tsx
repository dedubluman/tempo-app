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

export default function Home() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div data-page="landing" className="min-h-screen bg-[--bg-base] text-[--text-primary]">
      <LandingNav onAuthClick={() => setAuthOpen(true)} />

      <main>
        <LandingHero onAuthClick={() => setAuthOpen(true)} />
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
