import * as THREE from "three";

/** Shared travel speed so every feeder moves at the same pace. */
export const FLOW_MPS = 12;

export const energyColor = {
  warm: "#f4efe6",
  cyan: "#7ecbd4",
} as const;

export function polylineLength(points: readonly THREE.Vector3[]) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += points[i].distanceTo(points[i + 1]);
  }
  return total;
}

export function flowDuration(points: readonly THREE.Vector3[]) {
  return Math.max(0.7, polylineLength(points) / FLOW_MPS);
}

/** 0–1 once `reveal` passes `at`, with a short ramp. */
export function reached(reveal: number, at: number) {
  return THREE.MathUtils.smoothstep(reveal, Math.max(0, at - 0.03), Math.min(1, at + 0.07));
}

/** Fraction along a polyline of the point at `index`. */
export function fractionAt(points: readonly THREE.Vector3[], index: number) {
  const total = polylineLength(points);
  if (total <= 0) return 0;
  let walked = 0;
  const last = Math.min(index, points.length - 1);
  for (let i = 0; i < last; i += 1) walked += points[i].distanceTo(points[i + 1]);
  return walked / total;
}
