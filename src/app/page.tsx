import { Hero } from "@/components/hero/Hero";
import { SiteShell } from "@/components/layout/SiteShell";
import { AnalyticsSection } from "@/components/sections/AnalyticsSection";
import { StoryGate } from "@/components/story/StoryGate";

export default function HomePage() {
  return (
    <SiteShell>
      <StoryGate />
      <Hero />
      <AnalyticsSection />
    </SiteShell>
  );
}
