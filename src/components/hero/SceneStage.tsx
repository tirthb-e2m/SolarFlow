import { hero } from "@/content/story";
import { cx } from "@/lib/cx";
import { SCENE_STAGE_ID } from "@/scene/stage";

function FrameCorner({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("absolute h-5 w-5 border-white/80", className)}
    />
  );
}

/** Dusk frame on the opening screen. The WebGL walk is the next section. */
export function SceneStage() {
  return (
    <div
      id={SCENE_STAGE_ID}
      data-scene-mount="pending"
      data-rise
      className="relative h-52 w-full overflow-hidden sm:h-64 lg:h-[min(560px,calc(100svh-17rem))]"
    >
      <div aria-hidden="true" className="scene-dusk absolute inset-0" />
      <div
        aria-hidden="true"
        className="absolute top-[46%] left-[28%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-solar/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute top-[46%] left-[28%] -translate-x-1/2 -translate-y-1/2"
      >
        <div
          data-sun
          className="h-20 w-20 rounded-full bg-solar-soft shadow-[0_0_70px_18px_rgba(255,106,26,0.55)] will-change-transform sm:h-24 sm:w-24"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[46%] h-px bg-cyan/80"
      />
      <div aria-hidden="true" className="scene-grid absolute inset-0" />
      <FrameCorner className="top-3 left-3 border-t border-l" />
      <FrameCorner className="top-3 right-3 border-t border-r" />
      <FrameCorner className="bottom-3 left-3 border-b border-l" />
      <FrameCorner className="right-3 bottom-3 border-r border-b" />
      <p className="absolute top-5 left-5 font-sans text-[0.65rem] tracking-[0.22em] text-paper/75 uppercase">
        {hero.bearing}
      </p>
      <p className="absolute top-5 right-5 font-sans text-[0.65rem] tracking-[0.22em] text-paper/75 uppercase">
        {hero.index}
      </p>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy via-navy/75 to-transparent px-5 pt-16 pb-5">
        <p className="font-sans text-[0.68rem] tracking-[0.28em] text-cyan uppercase">
          {hero.sceneLabel}
        </p>
        <p className="mt-2 font-display text-2xl tracking-[-0.03em] text-paper sm:text-3xl">
          {hero.sceneNote}
        </p>
      </div>
      <p className="sr-only">
        Dusk horizon with the sun low. The rooftop walk continues in the scroll
        below.
      </p>
    </div>
  );
}
