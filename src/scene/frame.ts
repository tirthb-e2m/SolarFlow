import * as THREE from "three";

/** Look target between the villa roofs, the boulevard, and the canal. */
export const CITY_FOCUS = new THREE.Vector3(-8, 4.5, 8);

const CORNERS: ReadonlyArray<readonly [number, number, number]> = [
  [-92, 0, -72],
  [100, 0, -68],
  [-90, 0, 68],
  [98, 0, 66],
  [-48, 32, -6],
  [-28, 12, 18],
  [30, 4, 18],
  [-78, 18, 8],
  [88, 16, -12],
];

export const CAMERA_HOME = {
  /** From the south-southwest, so south walls and roofs both read. */
  azimuth: -0.5,
  /** Steeper than a horizon view so rooftops, streets, and the river stay legible. */
  polar: 0.8,
};

/** Home framing. Lower values move the camera closer. */
export const FRAME_HOME = 0.32;
/** Framing used while an installation is in focus. */
export const FRAME_FOCUS = 0.2;

/** User orbit, zoom, and pan limits. The home pose sits inside all of them. */
export const CAMERA_BOUNDS = {
  frameMin: 0.14,
  frameMax: 0.62,
  polarMin: 0.48,
  polarMax: 1.1,
  azimuthSpan: 1.35,
  lookMinX: -90,
  lookMaxX: 100,
  lookMinZ: -72,
  lookMaxZ: 68,
};

export function cityRadius() {
  let max = 0;
  for (const [x, y, z] of CORNERS) {
    max = Math.max(max, Math.hypot(x - CITY_FOCUS.x, y - CITY_FOCUS.y, z - CITY_FOCUS.z));
  }
  return max;
}

const RADIUS = cityRadius();

/** Fit the whole city inside the current view from an elevated oblique angle. */
export function placeCityCamera(
  camera: THREE.PerspectiveCamera,
  aspect: number,
  azimuth: number,
  polar: number,
  lookAt: THREE.Vector3 = CITY_FOCUS,
  frame = FRAME_HOME,
) {
  const fov = 28;
  camera.fov = fov;
  const vFov = THREE.MathUtils.degToRad(fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.25, aspect));
  const half = Math.min(vFov, hFov) / 2;
  const dist = (RADIUS / Math.sin(half)) * frame;
  const sinP = Math.sin(polar);
  camera.position.set(
    lookAt.x + Math.sin(azimuth) * sinP * dist,
    lookAt.y + Math.cos(polar) * dist,
    lookAt.z + Math.cos(azimuth) * sinP * dist,
  );
  camera.near = Math.max(0.25, dist / 220);
  camera.far = Math.max(dist * 8, 2400);
  camera.lookAt(lookAt);
  camera.updateProjectionMatrix();
  return dist;
}
