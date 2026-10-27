import { Section } from "@/components/layout/Section";
import { Prose } from "@/components/typography/Prose";
import { beats } from "@/content/story";
import { theme } from "@/theme/tokens";

const beat = beats.rooftop;

export function RooftopSection() {
  return (
    <Section
      id={beat.id}
      index={beat.index}
      kicker={beat.kicker}
      title={beat.title}
      atmosphere={
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-full bg-[radial-gradient(ellipse_at_left,rgba(255,106,26,0.16),transparent_58%)] md:w-1/2"
        />
      }
    >
      <Prose>{beat.lede}</Prose>
      <svg
        viewBox="0 0 420 160"
        fill="none"
        aria-hidden="true"
        className="mt-12 w-full max-w-lg"
      >
        <path
          d="M24 128 L210 28 L396 128"
          stroke={theme.color.paper}
          strokeOpacity="0.35"
        />
        <path d="M86 128 L210 64 L334 128" stroke={theme.color.solar} />
        <path
          d="M118 112 H302"
          stroke={theme.color.cyan}
          strokeOpacity="0.85"
        />
        <path d="M140 96 H280" stroke={theme.color.cyan} strokeOpacity="0.85" />
        <path d="M162 80 H258" stroke={theme.color.cyan} strokeOpacity="0.85" />
      </svg>
      <p className="mt-8 font-sans text-[0.68rem] tracking-[0.22em] text-paper/45 uppercase">
        Array story lands with the model
      </p>
    </Section>
  );
}
