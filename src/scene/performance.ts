export type RenderQuality = "high" | "low";

export type PerformanceHints = {
  quality: RenderQuality;
  dpr: [number, number];
  shadows: boolean;
  shadowMap: number;
  antialias: boolean;
  treeSway: boolean;
  reflectWater: boolean;
};

/** Initial quality from hardware signals — not just screen width. */
export function detectRenderQuality(): RenderQuality {
  if (typeof window === "undefined") return "high";
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const narrow = window.innerWidth < 900;
  const weakGpu = cores <= 4 || memory <= 4 || dpr >= 2.5 || !!saveData;
  if (narrow || weakGpu) return "low";
  return "high";
}

export function qualityHints(quality: RenderQuality): PerformanceHints {
  if (quality === "high") {
    return {
      quality,
      dpr: [1, 1.35],
      shadows: true,
      shadowMap: 1536,
      antialias: true,
      treeSway: true,
      reflectWater: true,
    };
  }
  return {
    quality,
    dpr: [1, 1],
    shadows: false,
    shadowMap: 512,
    antialias: false,
    treeSway: false,
    reflectWater: false,
  };
}

/**
 * Rolling FPS sample. Call once per frame with the frame delta.
 * Returns true when sustained performance is too low.
 */
export function createFpsWatch(fpsThreshold = 26, durationSec = 2.5) {
  const minFps = fpsThreshold;
  const maxSampleSec = durationSec;
  let elapsed = 0;
  let frames = 0;
  let poor = false;

  function sample(delta: number) {
    if (poor) return true;
    const dt = Math.min(Math.max(delta, 0), 0.1);
    elapsed += dt;
    frames += 1;
    if (elapsed < maxSampleSec) return false;
    const fps = frames / elapsed;
    elapsed = 0;
    frames = 0;
    if (fps < minFps) {
      poor = true;
      return true;
    }
    return false;
  }

  return {
    sample,
    get degraded() {
      return poor;
    },
  };
}