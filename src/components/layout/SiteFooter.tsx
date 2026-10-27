import { StoryAnchor } from "@/lib/story-scroll";
import { beatList, site } from "@/content/story";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="font-display text-4xl tracking-[-0.03em] text-paper">
            {site.name}
          </p>
          <p className="mt-3 max-w-sm font-sans text-sm leading-relaxed text-paper/60">
            A storytelling study of light kept after sunset.
          </p>
        </div>
        <ol className="flex flex-wrap gap-x-6 gap-y-2">
          {beatList.map((beat) => (
            <li key={beat.id}>
              <StoryAnchor
                id={beat.id}
                className="font-sans text-[0.68rem] font-medium tracking-[0.18em] text-mute uppercase hover:text-paper"
              >
                {beat.index} {beat.nav}
              </StoryAnchor>
            </li>
          ))}
        </ol>
      </div>
    </footer>
  );
}
