"use client";

import { SceneStage } from "@/components/hero/SceneStage";
import { ScrollCue } from "@/components/hero/ScrollCue";
import { Display } from "@/components/typography/Display";
import { Eyebrow } from "@/components/typography/Eyebrow";
import { Prose } from "@/components/typography/Prose";
import { hero } from "@/content/story";
import { gsap, useGSAP } from "@/lib/gsap";
import { useRef } from "react";

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const motion = gsap.matchMedia();

      motion.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });

        intro.from("[data-rise]", { y: 18, duration: 1.15, stagger: 0.08 }, 0);
        intro.to(
          "[data-sun]",
          {
            scale: 1.06,
            duration: 3.4,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            transformOrigin: "50% 50%",
          },
          0,
        );
        intro.to(
          "[data-scroll-tick]",
          {
            y: 28,
            duration: 1.2,
            ease: "power1.inOut",
            repeat: -1,
            yoyo: true,
          },
          0.45,
        );
      });

      return () => motion.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id={hero.id} className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_42%_32%_at_72%_46%,rgba(255,106,26,0.16),transparent_62%)]"
      />
      <p className="pointer-events-none absolute top-1/2 left-6 hidden -translate-y-1/2 font-sans text-[0.68rem] tracking-[0.42em] text-mute uppercase [writing-mode:vertical-rl] xl:block">
        Stored light
      </p>
      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-5 pt-28 pb-10 md:px-8 md:pt-32">
        <div className="grid flex-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <div data-rise>
              <Eyebrow index={hero.index} label={hero.kicker} />
            </div>
            <Display className="mt-6">
              {hero.lines.map((line, index) => (
                <span
                  key={line}
                  data-rise
                  className={
                    index === hero.emphasisIndex
                      ? "block text-solar italic"
                      : "block"
                  }
                >
                  {line}
                </span>
              ))}
            </Display>
            <Prose className="mt-6 max-w-md">
              <span data-rise className="block">
                {hero.subtitle}
              </span>
            </Prose>
          </div>
          <div className="lg:col-span-5">
            <SceneStage />
          </div>
        </div>
        <div className="pt-8">
          <ScrollCue label={hero.scrollLabel} />
        </div>
      </div>
    </section>
  );
}
