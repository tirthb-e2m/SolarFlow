import { Section } from "@/components/layout/Section";
import { Prose } from "@/components/typography/Prose";
import { beats } from "@/content/story";
import { theme } from "@/theme/tokens";

const beat = beats.floating;

const rafts = [
  "M40 96 L88 60 H168 L120 96 Z",
  "M188 96 L236 60 H316 L268 96 Z",
  "M336 96 L384 60 H448 L400 96 Z",
];

const reflections = [
  "M40 96 L88 132 H168 L120 96",
  "M188 96 L236 132 H316 L268 96",
  "M336 96 L384 132 H448 L400 96",
];

export function FloatingSolarSection() {
  return (
    <Section
      id={beat.id}
      index={beat.index}
      kicker={beat.kicker}
      title={beat.title}
      atmosphere={
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(60,231,255,0.1),transparent_68%)]"
        />
      }
    >
      <Prose>{beat.lede}</Prose>
      <svg
        viewBox="0 0 480 180"
        fill="none"
        aria-hidden="true"
        className="mt-12 w-full max-w-lg"
      >
        <path d="M0 96 H480" stroke={theme.color.cyan} strokeOpacity="0.75" />
        {rafts.map((d) => (
          <path
            key={d}
            d={d}
            stroke={theme.color.solar}
            fill={theme.color.solar}
            fillOpacity="0.16"
          />
        ))}
        {reflections.map((d) => (
          <path
            key={d}
            d={d}
            stroke={theme.color.cyan}
            strokeOpacity="0.35"
          />
        ))}
      </svg>
      <p className="mt-8 font-sans text-[0.68rem] tracking-[0.22em] text-paper/45 uppercase">
        Water story lands with the model
      </p>
    </Section>
  );
}
