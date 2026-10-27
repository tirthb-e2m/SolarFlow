import * as THREE from "three";

export type CameraKey = {
  t: number;
  position: readonly [number, number, number];
  lookAt: readonly [number, number, number];
  sun: number;
  fog: number;
  sky: string;
};

export const CAMERA_KEYS: CameraKey[] = [
  {
    t: 0,
    position: [11.5, 6.2, 13.2],
    lookAt: [0.2, 3.2, 0.4],
    sun: 2.4,
    fog: 0.016,
    sky: "#1a2433",
  },
  {
    t: 0.12,
    position: [2.8, 4.35, 6.4],
    lookAt: [0.15, 4.35, 1.05],
    sun: 2.7,
    fog: 0.014,
    sky: "#243044",
  },
  {
    t: 0.26,
    position: [4.8, 3.1, 9.2],
    lookAt: [0.4, 1.8, 20],
    sun: 0.85,
    fog: 0.02,
    sky: "#121c2e",
  },
  {
    t: 0.4,
    position: [-2.1, 1.75, 8.2],
    lookAt: [0.8, 1.45, 26],
    sun: 0.22,
    fog: 0.03,
    sky: "#070d18",
  },
  {
    t: 0.54,
    position: [2.6, 1.85, 24],
    lookAt: [-0.4, 1.35, 42],
    sun: 0.1,
    fog: 0.034,
    sky: "#070d18",
  },
  {
    t: 0.66,
    position: [8.4, 5.2, 44],
    lookAt: [0, 0.5, 70],
    sun: 0.55,
    fog: 0.02,
    sky: "#0d2230",
  },
  {
    t: 0.8,
    position: [7.2, 3.1, 56],
    lookAt: [-1.2, 0.85, 78],
    sun: 1.35,
    fog: 0.012,
    sky: "#163246",
  },
  {
    t: 0.92,
    position: [20, 14, 30],
    lookAt: [0, 1, 50],
    sun: 0.75,
    fog: 0.03,
    sky: "#0a1624",
  },
  {
    t: 1,
    position: [36, 28, 6],
    lookAt: [0, 0.4, 48],
    sun: 0.4,
    fog: 0.048,
    sky: "#06101c",
  },
];

const SNAP_TIMES = [0.12, 0.5, 0.8, 1];

export type PoseSample = {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  sun: number;
  fog: number;
  sky: THREE.Color;
};

const skyA = new THREE.Color();
const skyB = new THREE.Color();

function smooth(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function nearestSnap(progress: number) {
  return SNAP_TIMES.reduce((best, time) =>
    Math.abs(time - progress) < Math.abs(best - progress) ? time : best,
  );
}

export function samplePose(progress: number, reduceMotion: boolean, out: PoseSample) {
  const time = reduceMotion ? nearestSnap(progress) : Math.min(1, Math.max(0, progress));
  let index = 0;
  while (index < CAMERA_KEYS.length - 2 && time >= CAMERA_KEYS[index + 1].t) index += 1;

  const from = CAMERA_KEYS[index];
  const to = CAMERA_KEYS[index + 1];
  const span = Math.max(0.0001, to.t - from.t);
  const blended = smooth((time - from.t) / span);

  out.position.set(
    from.position[0] + (to.position[0] - from.position[0]) * blended,
    from.position[1] + (to.position[1] - from.position[1]) * blended,
    from.position[2] + (to.position[2] - from.position[2]) * blended,
  );
  out.lookAt.set(
    from.lookAt[0] + (to.lookAt[0] - from.lookAt[0]) * blended,
    from.lookAt[1] + (to.lookAt[1] - from.lookAt[1]) * blended,
    from.lookAt[2] + (to.lookAt[2] - from.lookAt[2]) * blended,
  );
  out.sun = from.sun + (to.sun - from.sun) * blended;
  out.fog = from.fog + (to.fog - from.fog) * blended;
  skyA.set(from.sky);
  skyB.set(to.sky);
  out.sky.copy(skyA).lerp(skyB, blended);
  return out;
}

export function lampAmount(progress: number, index: number) {
  const start = 0.34 + index * 0.035;
  return smooth((progress - start) / 0.04);
}
