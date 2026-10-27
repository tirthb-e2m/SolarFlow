"use client";

import type { RefObject } from "react";
import { City } from "@/scene/city/City";
import { Traffic } from "@/scene/city/Traffic";
import { Installations } from "@/scene/installations/Installations";
import type { InstallationController } from "@/scene/installations";
import type { PerformanceHints } from "@/scene/performance";
import type { StoryRuntime } from "@/scene/runtime";
import { Water } from "@/scene/Water";

type WorldProps = {
  runtime: RefObject<StoryRuntime | null>;
  hints: PerformanceHints;
  installations: InstallationController;
};

export function World({ runtime, hints, installations }: WorldProps) {
  return (
    <>
      <City runtime={runtime} quality={hints.quality} treeSway={hints.treeSway} />
      <Traffic runtime={runtime} quality={hints.quality} />
      <Water runtime={runtime} quality={hints.quality} reflectWater={hints.reflectWater} />
      <Installations
        runtime={runtime}
        active={installations.active}
        play={installations.play}
        hovered={installations.hovered}
        onHover={installations.hover}
        onActivate={installations.activate}
        pointer={installations.pointer}
      />
    </>
  );
}
