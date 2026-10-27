"use client";

import { gsap, useGSAP } from "@/lib/gsap";
import { cx } from "@/lib/cx";
import { useRef, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
};

export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduceMotion = gsap.matchMedia();

      reduceMotion.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current, {
          autoAlpha: 0,
          y: 28,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 88%",
            once: true,
          },
        });
      });

      return () => reduceMotion.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cx(className)}>
      {children}
    </div>
  );
}
