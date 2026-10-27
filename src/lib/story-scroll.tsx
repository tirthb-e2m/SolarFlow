"use client";

import { ScrollTrigger } from "@/lib/gsap";
import type { ReactNode } from "react";

export const STORY_SCROLL = {
  rooftop: 0.1,
  streetlight: 0.46,
  "floating-solar": 0.76,
} as const;

export function scrollToStoryBeat(id: string) {
  if (!(id in STORY_SCROLL)) return false;
  const desktop = window.matchMedia("(min-width: 900px)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const trigger = ScrollTrigger.getById("solar-story");
  if (!desktop || reduce || !trigger) return false;

  const progress = STORY_SCROLL[id as keyof typeof STORY_SCROLL];
  const top = trigger.start + (trigger.end - trigger.start) * progress;
  window.scrollTo({ top, behavior: "smooth" });
  return true;
}

export function StoryAnchor({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`#${id}`}
      className={className}
      onClick={(event) => {
        if (scrollToStoryBeat(id)) event.preventDefault();
      }}
    >
      {children}
    </a>
  );
}
