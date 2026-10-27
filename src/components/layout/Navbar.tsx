import { StoryAnchor } from "@/lib/story-scroll";
import { theme } from "@/theme/tokens";
import { beatList, site } from "@/content/story";

function SunMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="3.15" fill={theme.color.solar} />
      <circle
        cx="9"
        cy="9"
        r="6.4"
        fill="none"
        stroke={theme.color.cyan}
        strokeWidth="1"
      />
    </svg>
  );
}

export function Navbar() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-navy via-navy/85 to-transparent">
      <div className="pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8 md:py-5">
        <a
          href="#horizon"
          className="inline-flex shrink-0 items-center gap-3 text-paper"
        >
          <SunMark />
          <span className="font-sans text-[0.78rem] font-medium tracking-[0.26em] uppercase">
            {site.name}
          </span>
        </a>
        <nav aria-label="Story sections" className="min-w-0 overflow-x-auto">
          <ul className="flex flex-nowrap justify-end gap-x-4 sm:gap-x-5">
            {beatList.map((beat) => (
              <li key={beat.id}>
                <StoryAnchor
                  id={beat.id}
                  className="font-sans text-[0.68rem] font-medium tracking-[0.18em] whitespace-nowrap text-mute uppercase transition-colors hover:text-paper"
                >
                  {beat.nav}
                </StoryAnchor>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
