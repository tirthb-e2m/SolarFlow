export type VehicleKind = "car" | "van" | "truck";

/** Body extents in the vehicle frame. +Z is forward, +X is to the right, origin is on the ground. */
export type VehicleMetrics = {
  nose: number;
  tail: number;
  halfWidth: number;
  headX: number;
  headY: number;
  headZ: number;
  tailX: number;
  tailY: number;
  tailZ: number;
  headScale: number;
  tailScale: number;
};

export const VEHICLE_METRICS: Record<VehicleKind, VehicleMetrics> = {
  car: {
    nose: 2.16,
    tail: 2.1,
    halfWidth: 0.9,
    headX: 0.62,
    headY: 0.56,
    headZ: 2.12,
    tailX: 0.64,
    tailY: 0.58,
    tailZ: -2.04,
    headScale: 1,
    tailScale: 1,
  },
  van: {
    nose: 2.38,
    tail: 2.42,
    halfWidth: 0.98,
    headX: 0.68,
    headY: 0.7,
    headZ: 2.32,
    tailX: 0.72,
    tailY: 0.74,
    tailZ: -2.34,
    headScale: 1.06,
    tailScale: 1.08,
  },
  truck: {
    nose: 2.28,
    tail: 2.92,
    halfWidth: 1.02,
    headX: 0.7,
    headY: 0.84,
    headZ: 2.2,
    tailX: 0.78,
    tailY: 0.9,
    tailZ: -2.82,
    headScale: 1.16,
    tailScale: 1.12,
  },
};

export function restingGap(follower: VehicleKind, leader: VehicleKind) {
  if (follower === "truck" || leader === "truck") return 5.8;
  if (follower === "van" || leader === "van") return 4.5;
  return 3.7;
}
