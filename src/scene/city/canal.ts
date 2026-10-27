export const CANAL_HALF = 6.15;

/** Gentle eastward bow. z is south, x is east, in meters. */
export function canalX(z: number) {
  const t = Math.min(1, Math.max(0, (z + 56) / 112));
  return 23 + t * 7 + Math.sin(t * Math.PI) * 2;
}

export type CanalSample = {
  z: number;
  x: number;
  nx: number;
  nz: number;
};

export function canalSamples(step: number, z0 = -78, z1 = 72): CanalSample[] {
  const out: CanalSample[] = [];
  for (let z = z0; z <= z1 + 0.001; z += step) {
    const zz = Math.min(z, z1);
    const x = canalX(zz);
    const dx = canalX(zz + 0.2) - canalX(zz - 0.2);
    const len = Math.hypot(dx, 0.4) || 1;
    out.push({ z: zz, x, nx: 0.4 / len, nz: -dx / len });
  }
  return out;
}

export function onWater(x: number, z: number, pad = 0) {
  return Math.abs(x - canalX(z)) < CANAL_HALF + pad;
}
