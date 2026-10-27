"use client";

import { useEffect, useState } from "react";

/** False during SSR and when the visitor prefers reduced motion. */
export function useChartMotion(): boolean {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAnimate(!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return animate;
}
