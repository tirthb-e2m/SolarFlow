import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import * as THREE from "three";

gsap.registerPlugin(useGSAP);

/** Play while hovered or installed. Reverse only when the pointer leaves an installation that was not clicked. */
export function steerTimeline(
  timeline: gsap.core.Timeline | null,
  active: boolean,
  hovered: boolean,
  reduceMotion: boolean,
) {
  if (!timeline) return;
  if (reduceMotion) {
    if (active || hovered) {
      timeline.progress(1);
      timeline.pause();
    }
    return;
  }
  if (active || hovered) timeline.play();
  else if (timeline.progress() > 0) timeline.reverse();
}

/** Seek to the installed pose when the visitor has asked for reduced motion. */
export function settleTimeline(timeline: gsap.core.Timeline, reduceMotion: boolean) {
  if (!reduceMotion) return;
  timeline.progress(1);
  timeline.pause();
}

export function ignoreInstallRaycast() {
  return undefined;
}

/** Stable polyline sampler. `pointAt` does not allocate. */
export function createPath(points: readonly THREE.Vector3[]) {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const len = points[i].distanceTo(points[i + 1]);
    lengths.push(len);
    total += len;
  }
  return {
    pointAt(t: number, out: THREE.Vector3) {
      const target = Math.min(1, Math.max(0, t)) * total;
      let remain = target;
      for (let i = 0; i < lengths.length; i += 1) {
        const len = lengths[i];
        if (remain <= len || i === lengths.length - 1) {
          const span = len === 0 ? 0 : Math.min(1, remain / len);
          return out.lerpVectors(points[i], points[i + 1], span);
        }
        remain -= len;
      }
      return out.copy(points[points.length - 1] ?? out);
    },
  };
}
