import type { StoryBeat } from "@/content/story";
import { beats, ending } from "@/content/story";
import { Display } from "@/components/typography/Display";
import { Eyebrow } from "@/components/typography/Eyebrow";
import { Prose } from "@/components/typography/Prose";

function Caption({
  chapter,
  kicker,
  title,
  lede,
}: {
  chapter: string;
  kicker?: string;
  title: string;
  lede: string;
}) {
  return (
    <div
      data-chapter={chapter}
      className="absolute right-6 bottom-8 left-5 max-w-xl opacity-0 will-change-[transform,opacity] md:right-10 md:bottom-12 md:left-10"
    >
      {kicker ? <Eyebrow index={chapter === "ending" ? "·" : beats[chapter as keyof typeof beats].index} label={kicker} /> : null}
      <Display as="h2" className="mt-4 max-w-[14ch]">
        {title}
      </Display>
      <Prose className="mt-4 text-paper/80">{lede}</Prose>
    </div>
  );
}

function BeatCaption({ beat }: { beat: StoryBeat }) {
  return (
    <Caption
      chapter={beat.id === "floating-solar" ? "floating" : beat.id}
      kicker={beat.kicker}
      title={beat.title}
      lede={beat.lede}
    />
  );
}

export function StoryOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-navy via-navy/80 to-transparent"
      />
      <BeatCaption beat={beats.rooftop} />
      <BeatCaption beat={beats.streetlight} />
      <Caption
        chapter="floating"
        kicker={beats.floating.kicker}
        title={beats.floating.title}
        lede={beats.floating.lede}
      />
      <Caption chapter="ending" kicker={ending.kicker} title={ending.title} lede={ending.lede} />
      <div
        aria-hidden="true"
        className="absolute top-1/2 right-4 hidden h-40 w-px -translate-y-1/2 bg-white/15 md:block"
      >
        <div data-story-rail className="h-full w-full origin-top bg-solar" />
      </div>
    </div>
  );
}
