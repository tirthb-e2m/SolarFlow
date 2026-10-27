"use client";

import dynamic from "next/dynamic";

const StoryExperience = dynamic(
  () => import("@/components/story/StoryExperience").then((mod) => mod.StoryExperience),
  {
    ssr: false,
    loading: () => <div className="h-[100vh] w-full bg-[#d5e4f2]" aria-hidden="true" />,
  },
);

export function StoryGate() {
  return <StoryExperience />;
}
