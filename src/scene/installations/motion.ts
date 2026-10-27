import * as THREE from "three";

export function approach(current: number, target: number, delta: number, reduceMotion: boolean) {
  if (reduceMotion || delta <= 0) return target;
  return THREE.MathUtils.damp(current, target, 8, delta);
}

export function emphasisTarget(hovered: boolean, active: boolean) {
  if (hovered) return 1;
  if (active) return 0.42;
  return 0;
}

/** World meters covered by one screen pixel at `distance` from a perspective camera. */
export function worldPerPixel(camera: THREE.PerspectiveCamera, distance: number, viewportHeight: number) {
  const worldHeight =
    2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * Math.max(0.001, distance);
  return worldHeight / Math.max(1, viewportHeight);
}
