import { Section } from "@/components/layout/Section";
import { Prose } from "@/components/typography/Prose";
import { beats } from "@/content/story";
import { theme } from "@/theme/tokens";

const beat = beats.streetlight;

export function StreetlightSection() {
  return (
    <Section
      id={beat.id}
      index={beat.index}
      kicker={beat.kicker}
      title={beat.title}
    >
      <Prose>{beat.lede}</Prose>
      <svg
        viewBox="0 0 200 230"
        fill="none"
        aria-hidden="true"
        className="mt-12 h-56"
      >
        <circle cx="100" cy="34" r="26" fill={theme.color.solar} opacity="0.22" />
        <rect x="70" y="22" width="60" height="16" fill={theme.color.solar} />
        <path
          d="M100 38 V196"
          stroke={theme.color.paper}
          strokeOpacity="0.5"
        />
        <path d="M36 196 H164" stroke={theme.color.cyan} strokeOpacity="0.75" />
      </svg>
      <p className="mt-8 font-sans text-[0.68rem] tracking-[0.22em] text-paper/45 uppercase">
        Lamp story lands with the model
      </p>
    </Section>
  );
}
