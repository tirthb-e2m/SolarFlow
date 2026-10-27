import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { Reveal } from "@/components/motion/Reveal";
import { Display } from "@/components/typography/Display";
import { Eyebrow } from "@/components/typography/Eyebrow";
import { Prose } from "@/components/typography/Prose";
import { beats } from "@/content/story";

const beat = beats.analytics;

export function AnalyticsSection() {
  return (
    <section id={beat.id} className="relative border-t border-white/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(255,106,26,0.09),transparent_64%)]"
      />
      <div className="relative mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <Reveal>
          <Eyebrow index={beat.index} label={beat.kicker} />
          <Display as="h2" className="mt-6 max-w-[12ch]">
            {beat.title}
          </Display>
          <Prose className="mt-6">{beat.lede}</Prose>
        </Reveal>
        <Reveal className="mt-14 md:mt-16">
          <AnalyticsDashboard />
        </Reveal>
      </div>
    </section>
  );
}
