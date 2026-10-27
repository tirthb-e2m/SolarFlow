import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as THREE from "three";
import type { CanalSample } from "@/scene/city/canal";

export type ShadowMode = "both" | "receive" | "none";

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

const localPos = new THREE.Vector3();
const localQuat = new THREE.Quaternion();
const localScale = new THREE.Vector3();
const localM = new THREE.Matrix4();
const worldM = new THREE.Matrix4();
const yAxis = new THREE.Vector3(0, 1, 0);
const xAxis = new THREE.Vector3(1, 0, 0);
const composePos = new THREE.Vector3();
const composeQuat = new THREE.Quaternion();
const composeScale = new THREE.Vector3(1, 1, 1);
const euler = new THREE.Euler();

export class Bucket {
  private items = new Map<
    string,
    { mat: THREE.Material; mode: ShadowMode; geos: THREE.BufferGeometry[] }
  >();

  add(key: string, mat: THREE.Material, geo: THREE.BufferGeometry, mode: ShadowMode = "both") {
    const slot = this.items.get(key) ?? { mat, mode, geos: [] };
    slot.geos.push(geo);
    this.items.set(key, slot);
  }

  flush(group: THREE.Group) {
    this.items.forEach((slot, name) => {
      if (slot.geos.length === 0) return;
      const merged = slot.geos.length === 1 ? slot.geos[0] : mergeGeometries(slot.geos, false);
      if (!merged) {
        slot.geos.forEach((geo) => geo.dispose());
        return;
      }
      if (slot.geos.length > 1) slot.geos.forEach((geo) => geo.dispose());
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, slot.mat);
      mesh.name = name;
      mesh.castShadow = slot.mode === "both";
      mesh.receiveShadow = slot.mode !== "none";
      group.add(mesh);
    });
  }
}

function scaleUv(geo: THREE.BufferGeometry, su: number, sv: number) {
  const uv = geo.getAttribute("uv");
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
}

export function makeOrigin(x: number, z: number, yaw = 0) {
  const origin = new THREE.Matrix4();
  composeQuat.setFromAxisAngle(yAxis, yaw);
  origin.compose(composePos.set(x, 0, z), composeQuat, composeScale);
  return origin;
}

export function placeBox(
  bucket: Bucket,
  key: string,
  mat: THREE.Material,
  origin: THREE.Matrix4,
  lx: number,
  ly: number,
  lz: number,
  w: number,
  h: number,
  d: number,
  yaw = 0,
  uv?: readonly [number, number],
  mode: ShadowMode = "both",
) {
  const geo = UNIT_BOX.clone();
  if (uv) scaleUv(geo, uv[0], uv[1]);
  localQuat.setFromAxisAngle(yAxis, yaw);
  localM.compose(localPos.set(lx, ly, lz), localQuat, localScale.set(w, h, d));
  worldM.multiplyMatrices(origin, localM);
  geo.applyMatrix4(worldM);
  bucket.add(key, mat, geo, mode);
}

type Facing = "+z" | "-z" | "+x" | "-x" | "+y";

export function placePlane(
  bucket: Bucket,
  key: string,
  mat: THREE.Material,
  origin: THREE.Matrix4,
  lx: number,
  ly: number,
  lz: number,
  w: number,
  h: number,
  facing: Facing,
  uv?: readonly [number, number],
  mode: ShadowMode = "both",
) {
  const geo = UNIT_PLANE.clone();
  if (uv) scaleUv(geo, uv[0], uv[1]);
  if (facing === "+y") localQuat.setFromAxisAngle(xAxis, -Math.PI / 2);
  else if (facing === "-z") localQuat.setFromAxisAngle(yAxis, Math.PI);
  else if (facing === "+x") localQuat.setFromAxisAngle(yAxis, Math.PI / 2);
  else if (facing === "-x") localQuat.setFromAxisAngle(yAxis, -Math.PI / 2);
  else localQuat.identity();
  localM.compose(localPos.set(lx, ly, lz), localQuat, localScale.set(w, h, 1));
  worldM.multiplyMatrices(origin, localM);
  geo.applyMatrix4(worldM);
  bucket.add(key, mat, geo, mode);
}

export function placeCylinder(
  bucket: Bucket,
  key: string,
  mat: THREE.Material,
  origin: THREE.Matrix4,
  lx: number,
  ly: number,
  lz: number,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  pitch = 0,
  yaw = 0,
  roll = 0,
  mode: ShadowMode = "both",
) {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
  localQuat.setFromEuler(euler.set(pitch, yaw, roll, "XYZ"));
  localM.compose(localPos.set(lx, ly, lz), localQuat, localScale.set(1, 1, 1));
  worldM.multiplyMatrices(origin, localM);
  geo.applyMatrix4(worldM);
  bucket.add(key, mat, geo, mode);
}

export function placeSphere(
  bucket: Bucket,
  key: string,
  mat: THREE.Material,
  origin: THREE.Matrix4,
  lx: number,
  ly: number,
  lz: number,
  sx: number,
  sy: number,
  sz: number,
  mode: ShadowMode = "both",
) {
  const geo = new THREE.SphereGeometry(1, 16, 12);
  localQuat.identity();
  localM.compose(localPos.set(lx, ly, lz), localQuat, localScale.set(sx, sy, sz));
  worldM.multiplyMatrices(origin, localM);
  geo.applyMatrix4(worldM);
  bucket.add(key, mat, geo, mode);
}

export function placeGable(
  bucket: Bucket,
  key: string,
  mat: THREE.Material,
  origin: THREE.Matrix4,
  length: number,
  width: number,
  rise: number,
  overhang: number,
  lift: number,
) {
  const hw = width / 2 + overhang;
  const hl = length / 2 + overhang;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const add = (x: number, y: number, z: number) => {
    const index = positions.length / 3;
    positions.push(x, y, z);
    uvs.push(z / 0.45, x / 0.45);
    return index;
  };
  const left = [
    add(-hw, 0, -hl),
    add(-hw, 0, hl),
    add(0, rise, hl),
    add(0, rise, -hl),
  ];
  indices.push(left[0], left[2], left[1], left[0], left[3], left[2]);
  const right = [
    add(hw, 0, -hl),
    add(0, rise, -hl),
    add(0, rise, hl),
    add(hw, 0, hl),
  ];
  indices.push(right[0], right[1], right[2], right[0], right[2], right[3]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const liftM = new THREE.Matrix4().makeTranslation(0, lift, 0);
  worldM.multiplyMatrices(origin, liftM);
  geo.applyMatrix4(worldM);
  bucket.add(key, mat, geo, "both");
}

/** Hip roof. `length` runs along Z, `width` along X, ridge on the longer axis. */
export function placeHip(
  bucket: Bucket,
  key: string,
  mat: THREE.Material,
  origin: THREE.Matrix4,
  length: number,
  width: number,
  rise: number,
  overhang: number,
  lift: number,
) {
  const hw = width / 2 + overhang;
  const hl = length / 2 + overhang;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const add = (x: number, y: number, z: number) => {
    const index = positions.length / 3;
    positions.push(x, y, z);
    uvs.push(x / 0.42, z / 0.42);
    return index;
  };
  const e00 = add(-hw, 0, -hl);
  const e10 = add(hw, 0, -hl);
  const e11 = add(hw, 0, hl);
  const e01 = add(-hw, 0, hl);
  if (hl >= hw) {
    const hz = Math.max(0.08, hl - hw);
    const r0 = add(0, rise, -hz);
    const r1 = add(0, rise, hz);
    indices.push(e01, e11, r1, e00, r0, e10, e10, r0, r1, e10, r1, e11, e01, r1, r0, e01, r0, e00);
  } else {
    const hx = Math.max(0.08, hw - hl);
    const r0 = add(-hx, rise, 0);
    const r1 = add(hx, rise, 0);
    indices.push(e00, e01, r0, e10, r1, e11, e01, e11, r1, e01, r1, r0, e00, r0, r1, e00, r1, e10);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const liftM = new THREE.Matrix4().makeTranslation(0, lift, 0);
  worldM.multiplyMatrices(origin, liftM);
  geo.applyMatrix4(worldM);
  bucket.add(key, mat, geo, "both");
}

export function placeGableEnds(
  bucket: Bucket,
  key: string,
  mat: THREE.Material,
  origin: THREE.Matrix4,
  length: number,
  width: number,
  rise: number,
  lift: number,
) {
  const hw = width / 2;
  const hl = length / 2;
  const positions = [
    -hw, 0, hl, hw, 0, hl, 0, rise, hl, -hw, 0, -hl, 0, rise, -hl, hw, 0, -hl,
  ];
  const uvs = [0, 0, 1, 0, 0.5, 1, 0, 0, 0.5, 1, 1, 0];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex([0, 1, 2, 3, 4, 5]);
  geo.computeVertexNormals();
  const liftM = new THREE.Matrix4().makeTranslation(0, lift, 0);
  worldM.multiplyMatrices(origin, liftM);
  geo.applyMatrix4(worldM);
  bucket.add(key, mat, geo, "both");
}

export function placeCanalStrip(
  bucket: Bucket,
  key: string,
  mat: THREE.Material,
  samples: CanalSample[],
  left: number,
  right: number,
  yLeft: number,
  yRight: number,
  skip: (zMid: number) => boolean,
  mode: ShadowMode = "receive",
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  samples.forEach((sample, i) => {
    positions.push(
      sample.x + sample.nx * left,
      yLeft,
      sample.z + sample.nz * left,
      sample.x + sample.nx * right,
      yRight,
      sample.z + sample.nz * right,
    );
    const v = i * 0.2;
    uvs.push(0, v, 1, v);
    const next = samples[i + 1];
    if (!next || skip((sample.z + next.z) / 2)) return;
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  });
  if (indices.length === 0) return;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  bucket.add(key, mat, geo, mode);
}
