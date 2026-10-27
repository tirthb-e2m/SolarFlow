import * as THREE from "three";

const direction = new THREE.Vector3();
const side = new THREE.Vector3();

/**
 * Straight ribbon along a polyline. Width stays on the ground for horizontal
 * runs and on the wall for vertical drops, so the line cannot cut a corner
 * through a building.
 */
export function createRibbon(points: readonly THREE.Vector3[], width: number) {
  const geometry = new THREE.BufferGeometry();
  if (points.length < 2) return geometry;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const total = points.reduce((sum, point, index) => {
    if (index === 0) return 0;
    return sum + point.distanceTo(points[index - 1]);
  }, 0);
  const half = width * 0.5;
  let walked = 0;

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    direction.subVectors(b, a);
    const horizontal = Math.hypot(direction.x, direction.z);
    if (horizontal < Math.abs(direction.y) * 0.45) {
      side.set(1, 0, 0);
    } else {
      side.set(-direction.z, 0, direction.x);
      if (side.lengthSq() > 0) side.normalize();
      else side.set(1, 0, 0);
    }
    const length = a.distanceTo(b);
    const u0 = total > 0 ? walked / total : 0;
    walked += length;
    const u1 = total > 0 ? walked / total : 1;
    const origin = positions.length / 3;
    for (const [point, u, sign] of [
      [a, u0, -1],
      [a, u0, 1],
      [b, u1, -1],
      [b, u1, 1],
    ] as const) {
      positions.push(point.x + side.x * half * sign, point.y, point.z + side.z * half * sign);
      uvs.push(u, sign);
    }
    indices.push(origin, origin + 2, origin + 1, origin + 1, origin + 2, origin + 3);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
