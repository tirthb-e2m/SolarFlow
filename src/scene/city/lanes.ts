export type RoadLoop = {
  x: Float32Array;
  z: Float32Array;
  cum: Float32Array;
  total: number;
};

const scratch: number[] = [];
const scratchZ: number[] = [];

function push(x: number, z: number) {
  const n = scratch.length;
  if (n > 0 && Math.hypot(scratch[n - 1] - x, scratchZ[n - 1] - z) < 0.04) return;
  scratch.push(x);
  scratchZ.push(z);
}

function straight(x0: number, z0: number, x1: number, z1: number) {
  const length = Math.hypot(x1 - x0, z1 - z0);
  const steps = Math.max(1, Math.ceil(length / 2));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    push(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
  }
}

/** Semicircle that stays inside the roadway. Angles are radians. */
function arc(cx: number, cz: number, radius: number, a0: number, a1: number) {
  const steps = 16;
  for (let i = 1; i <= steps; i += 1) {
    const a = a0 + (a1 - a0) * (i / steps);
    push(cx + Math.cos(a) * radius, cz + Math.sin(a) * radius);
  }
}

function bake(): RoadLoop {
  const x = Float32Array.from(scratch);
  const z = Float32Array.from(scratchZ);
  const cum = new Float32Array(x.length);
  let total = 0;
  for (let i = 0; i < x.length; i += 1) {
    const j = (i + 1) % x.length;
    total += Math.hypot(x[j] - x[i], z[j] - z[i]);
    cum[i] = total;
  }
  scratch.length = 0;
  scratchZ.length = 0;
  return { x, z, cum, total };
}

/** East-west boulevard, including the canal bridge, with a U-turn inside each end. */
function boulevard(): RoadLoop {
  const lane = 1.8;
  const x0 = -88;
  const x1 = 98;
  push(x0, lane);
  straight(x0, lane, x1, lane);
  arc(x1, 0, lane, Math.PI / 2, -Math.PI / 2);
  straight(x1, -lane, x0, -lane);
  arc(x0, 0, lane, -Math.PI / 2, -Math.PI * 1.5);
  return bake();
}

/** North-south avenue. Southbound is on the west side of the centerline. */
function avenue(center: number): RoadLoop {
  const lane = 1.4;
  const z0 = -66;
  const z1 = 60;
  push(center - lane, z0);
  straight(center - lane, z0, center - lane, z1);
  arc(center, z1, lane, Math.PI, 0);
  straight(center + lane, z1, center + lane, z0);
  arc(center, z0, lane, 0, -Math.PI);
  return bake();
}

export const roadLoops = [
  boulevard(),
  avenue(-78),
  avenue(-44),
  avenue(-14),
  avenue(8.5),
  avenue(64),
  avenue(88),
];

export type Pose = { x: number; z: number; yaw: number };

export function sampleLoop(loop: RoadLoop, distance: number, out: Pose) {
  const span = loop.total || 1;
  let d = distance % span;
  if (d < 0) d += span;
  let i = 0;
  const cum = loop.cum;
  while (i < cum.length - 1 && cum[i] < d) i += 1;
  const prev = i === 0 ? 0 : cum[i - 1];
  const seg = cum[i] - prev;
  const t = seg > 0.0001 ? (d - prev) / seg : 0;
  const j = (i + 1) % loop.x.length;
  const x0 = loop.x[i];
  const z0 = loop.z[i];
  const x1 = loop.x[j];
  const z1 = loop.z[j];
  out.x = x0 + (x1 - x0) * t;
  out.z = z0 + (z1 - z0) * t;
  out.yaw = Math.atan2(x1 - x0, z1 - z0);
  return out;
}
