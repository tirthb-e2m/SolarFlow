import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as THREE from "three";
import type { ModelKey } from "@/scene/assets";
import { CANAL_HALF, canalSamples, canalX } from "@/scene/city/canal";
import {
  BRIDGE,
  FOOTBRIDGE,
  blocks,
  blocked,
  intersections,
  rectContains,
  roads,
  type Block,
  type Rect,
} from "@/scene/city/layout";
import {
  Bucket,
  makeOrigin,
  placeBox,
  placeCanalStrip,
  placeCylinder,
  placeGable,
  placeGableEnds,
  placeHip,
  placePlane,
  placeSphere,
} from "@/scene/city/meshes";
import type { PropSlot } from "@/scene/city/GlbProp";
import { WALL_COLORS, createCityMaterials, type CityMaterials } from "@/scene/city/textures";
import { createVehicleLayers } from "@/scene/city/vehicles";

const IDENTITY = new THREE.Matrix4();
const WALLS = WALL_COLORS;
const PAINTS = ["#f4f6f8", "#d5dae0", "#2c323a", "#8d322c", "#1d4d86", "#e4d8c4", "#3d4a38", "#c45c28", "#1f6b4a"];

const ROAD_Y = 0.06;
const ROAD_H = 0.08;
const MARK_Y = 0.112;
const WALK = 1.46;

export type TreeSpot = { x: number; z: number; s: number; kind: number };
type CarSpot = { x: number; z: number; yaw: number; color: number; y: number };
export type LampSpot = { x: number; z: number; yaw: number; solar?: boolean };

/** World pose for a single GLB house review slot. Roof stays clear of solar panels. */
export type CottageSlot = {
  x: number;
  z: number;
  yaw: number;
  targetW: number;
  targetD: number;
};

type Draft = {
  bucket: Bucket;
  mats: CityMaterials;
  trees: TreeSpot[];
  cars: CarSpot[];
  lamps: LampSpot[];
  footprints: Rect[];
  props: PropSlot[];
  quality: "high" | "low";
  cottage: CottageSlot | null;
  gptBuilding: CottageSlot | null;
  skyscraper: CottageSlot | null;
};

export type CanopySway = {
  mesh: THREE.InstancedMesh;
  index: number[];
  x: number[];
  y: number[];
  z: number[];
  sx: number[];
  sy: number[];
  sz: number[];
  yaw: number[];
};

export type CityBuild = {
  object: THREE.Group;
  glow: THREE.MeshStandardMaterial[];
  lampMaterials: THREE.MeshStandardMaterial[];
  lights: THREE.SpotLight[];
  canopies: CanopySway[];
  pools: THREE.MeshBasicMaterial | null;
  cottage: CottageSlot | null;
  gptBuilding: CottageSlot | null;
  skyscraper: CottageSlot | null;
  props: PropSlot[];
  trees: TreeSpot[];
  lamps: LampSpot[];
  dispose: () => void;
};

function hash01(x: number, z: number) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function worldPoint(x: number, z: number, yaw: number, lx: number, lz: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: x + lx * c + lz * s, z: z - lx * s + lz * c };
}

function addSidewalk(draft: Draft, block: Rect) {
  const { bucket, mats } = draft;
  const y = 0.09;
  const h = 0.1;
  const edgeZ = block.d / 2 - WALK / 2;
  placeBox(bucket, "walk", mats.walk, IDENTITY, block.x, y, block.z - edgeZ, block.w, h, WALK, 0, [block.w / 2, 1], "receive");
  placeBox(bucket, "walk", mats.walk, IDENTITY, block.x, y, block.z + edgeZ, block.w, h, WALK, 0, [block.w / 2, 1], "receive");
  const sideD = Math.max(0.4, block.d - WALK * 2);
  const edgeX = block.w / 2 - WALK / 2;
  placeBox(bucket, "walk", mats.walk, IDENTITY, block.x - edgeX, y, block.z, WALK, h, sideD, 0, [1, sideD / 2], "receive");
  placeBox(bucket, "walk", mats.walk, IDENTITY, block.x + edgeX, y, block.z, WALK, h, sideD, 0, [1, sideD / 2], "receive");
  const curbY = 0.08;
  const curbH = 0.16;
  const curbT = 0.16;
  placeBox(bucket, "curb", mats.curb, IDENTITY, block.x, curbY, block.z - block.d / 2, block.w, curbH, curbT, 0, undefined, "receive");
  placeBox(bucket, "curb", mats.curb, IDENTITY, block.x, curbY, block.z + block.d / 2, block.w, curbH, curbT, 0, undefined, "receive");
  placeBox(bucket, "curb", mats.curb, IDENTITY, block.x - block.w / 2, curbY, block.z, curbT, curbH, sideD, 0, undefined, "receive");
  placeBox(bucket, "curb", mats.curb, IDENTITY, block.x + block.w / 2, curbY, block.z, curbT, curbH, sideD, 0, undefined, "receive");
}

function flatRoof(
  draft: Draft,
  origin: THREE.Matrix4,
  fw: number,
  fd: number,
  wallTop: number,
  membraneIndex: number,
  chimney: boolean,
) {
  const { bucket, mats } = draft;
  const slab = 0.2;
  const membrane = mats.membrane[membraneIndex % mats.membrane.length];
  const roofKey = `roof-${membraneIndex % mats.membrane.length}`;
  placeBox(bucket, roofKey, membrane, origin, 0, wallTop + slab / 2, 0, fw, slab, fd, 0, [fw / 2, fd / 2]);
  const base = wallTop + slab;
  const ph = 0.56;
  const t = 0.16;
  const py = base + ph / 2;
  placeBox(bucket, "parapet", mats.parapet, origin, 0, py, fd / 2 - t / 2, fw, ph, t);
  placeBox(bucket, "parapet", mats.parapet, origin, 0, py, -fd / 2 + t / 2, fw, ph, t);
  placeBox(bucket, "parapet", mats.parapet, origin, fw / 2 - t / 2, py, 0, t, ph, fd - t * 2);
  placeBox(bucket, "parapet", mats.parapet, origin, -fw / 2 + t / 2, py, 0, t, ph, fd - t * 2);
  const capY = base + ph + 0.04;
  const ct = t + 0.05;
  placeBox(bucket, "cap", mats.cap, origin, 0, capY, fd / 2 - t / 2, fw + 0.06, 0.07, ct);
  placeBox(bucket, "cap", mats.cap, origin, 0, capY, -fd / 2 + t / 2, fw + 0.06, 0.07, ct);
  placeBox(bucket, "cap", mats.cap, origin, fw / 2 - t / 2, capY, 0, ct, 0.07, fd - t * 2);
  placeBox(bucket, "cap", mats.cap, origin, -fw / 2 + t / 2, capY, 0, ct, 0.07, fd - t * 2);
  const fieldW = Math.max(1, fw - 1.7);
  const fieldD = Math.max(1, fd - 1.7);
  placePlane(
    bucket,
    `${roofKey}-field`,
    membrane,
    origin,
    0,
    base + 0.05,
    0,
    fieldW,
    fieldD,
    "+y",
    [fieldW / 2, fieldD / 2],
    "receive",
  );
  placeCylinder(bucket, "vent", mats.metalDark, origin, -fw / 2 + 0.7, base + 0.28, fd / 2 - 0.65, 0.08, 0.1, 0.46, 8);
  placeCylinder(bucket, "vent", mats.metalDark, origin, -fw / 2 + 1.2, base + 0.18, fd / 2 - 0.65, 0.05, 0.07, 0.26, 8);
  if (chimney) {
    placeBox(
      bucket,
      "chimney",
      mats.brick,
      origin,
      fw / 2 - 0.72,
      base + 0.48,
      -fd / 2 + 0.72,
      0.42,
      0.9,
      0.42,
    );
    placeBox(bucket, "chimney-cap", mats.cap, origin, fw / 2 - 0.72, base + 0.96, -fd / 2 + 0.72, 0.52, 0.06, 0.52);
  }
  return base + ph;
}

function addPitched(
  draft: Draft,
  origin: THREE.Matrix4,
  fw: number,
  fd: number,
  wallTop: number,
  kind: "gable" | "hip",
  style: number,
  gableKey: string,
  gableMat: THREE.Material,
) {
  const { bucket, mats } = draft;
  const roofs = [mats.tile, mats.slate, mats.shingle];
  const keys = ["tile", "slate", "shingle"];
  const roofIndex = Math.abs(style) % roofs.length;
  const rise = kind === "hip" ? Math.min(fw, fd) * 0.24 : Math.min(fw, fd) * 0.4;
  const overhang = 0.2;
  if (kind === "gable") {
    placeGable(bucket, keys[roofIndex], roofs[roofIndex], origin, fd, fw, rise, overhang, wallTop);
    placeGableEnds(bucket, gableKey, gableMat, origin, fd, fw, rise, wallTop);
    placeBox(bucket, "ridge", mats.cap, origin, 0, wallTop + rise + 0.04, 0, 0.18, 0.08, fd + overhang * 2);
    placeBox(bucket, "fascia", mats.cap, origin, fw / 2 + overhang * 0.4, wallTop + 0.08, 0, 0.08, 0.18, fd + overhang);
    placeBox(bucket, "fascia", mats.cap, origin, -fw / 2 - overhang * 0.4, wallTop + 0.08, 0, 0.08, 0.18, fd + overhang);
  } else {
    placeHip(bucket, keys[roofIndex], roofs[roofIndex], origin, fd, fw, rise, overhang, wallTop);
    placeBox(bucket, "fascia", mats.cap, origin, 0, wallTop + 0.07, fd / 2 + overhang * 0.35, fw + overhang * 1.4, 0.14, 0.08);
    placeBox(bucket, "fascia", mats.cap, origin, 0, wallTop + 0.07, -fd / 2 - overhang * 0.35, fw + overhang * 1.4, 0.14, 0.08);
    placeBox(bucket, "fascia", mats.cap, origin, fw / 2 + overhang * 0.35, wallTop + 0.07, 0, 0.08, 0.14, fd);
    placeBox(bucket, "fascia", mats.cap, origin, -fw / 2 - overhang * 0.35, wallTop + 0.07, 0, 0.08, 0.14, fd);
  }
  const chimneyY = wallTop + rise * 0.42;
  placeBox(bucket, "chimney", mats.brick, origin, fw * 0.24, chimneyY, -fd * 0.16, 0.4, rise * 0.72, 0.4);
  placeBox(bucket, "chimney-cap", mats.cap, origin, fw * 0.24, chimneyY + rise * 0.38, -fd * 0.16, 0.5, 0.06, 0.5);
  placeCylinder(bucket, "pot", mats.metalDark, origin, fw * 0.24, chimneyY + rise * 0.46, -fd * 0.16, 0.1, 0.13, 0.2, 8);
  if (kind === "gable" && fw > 6) {
    placeBox(bucket, `dormer-${gableKey}`, gableMat, origin, 0, wallTop + rise * 0.48, fd * 0.12, 1.15, rise * 0.42, 0.9);
    placeBox(bucket, "dormer-glass", mats.glass, origin, 0, wallTop + rise * 0.5, fd * 0.12 + 0.46, 0.7, rise * 0.22, 0.04);
  }
  return wallTop + rise;
}

function addHouse(
  draft: Draft,
  x: number,
  z: number,
  yaw: number,
  fw: number,
  fd: number,
  floors: number,
  index: number,
  roof: "flat" | "gable" | "hip",
  villa: boolean,
  solar = false,
) {
  const { bucket, mats } = draft;
  const colorIndex = Math.abs(Math.round(hash01(x, z) * WALLS.length + index)) % WALLS.length;
  const wallH = floors * 3.05;
  const plinth = 0.22;
  const origin = makeOrigin(x, z, yaw);
  const yard = mats.lawns[colorIndex % mats.lawns.length];
  placeBox(
    bucket,
    `yard-${colorIndex % mats.lawns.length}`,
    yard,
    origin,
    0,
    0.04,
    0.35,
    fw + (villa ? 2.6 : 1.1),
    0.04,
    fd + (villa ? 2.5 : 1.4),
    0,
    [2.4, 2.2],
    "receive",
  );
  placeBox(bucket, "plinth", mats.concrete, origin, 0, plinth / 2 + 0.02, 0, fw + 0.16, plinth, fd + 0.16, 0, undefined, "receive");
  placeBox(bucket, `mass-${colorIndex}`, mats.walls[colorIndex], origin, 0, plinth + wallH / 2, 0, fw, wallH, fd);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      placeBox(
        bucket,
        "pilaster",
        mats.cap,
        origin,
        sx * (fw / 2 - 0.02),
        plinth + wallH / 2,
        sz * (fd / 2 - 0.02),
        0.16,
        wallH + 0.04,
        0.16,
      );
    }
  }
  for (let floor = 1; floor < floors; floor += 1) {
    const band = plinth + floor * 3.05;
    placeBox(bucket, "sill", mats.cap, origin, 0, band, fd / 2 + 0.04, fw + 0.08, 0.08, 0.12);
    placeBox(bucket, "sill", mats.cap, origin, 0, band, -fd / 2 - 0.04, fw + 0.08, 0.08, 0.12);
  }
  placeBox(bucket, "cornice", mats.cap, origin, 0, plinth + wallH - 0.06, 0, fw + 0.22, 0.12, fd + 0.22);
  const height = wallH;
  const front = mats.house({
    id: `house-${colorIndex}-${floors}-front-${fw.toFixed(2)}`,
    width: fw - 0.16,
    height,
    floors,
    wall: WALLS[colorIndex],
    door: true,
  });
  const back = mats.house({
    id: `house-${colorIndex}-${floors}-back-${fw.toFixed(2)}`,
    width: fw - 0.16,
    height,
    floors,
    wall: WALLS[colorIndex],
    door: false,
  });
  const side = mats.house({
    id: `house-${colorIndex}-${floors}-side-${fd.toFixed(2)}`,
    width: fd - 0.16,
    height,
    floors,
    wall: WALLS[colorIndex],
    door: false,
  });
  const y = plinth + height / 2;
  placePlane(bucket, front.name, front, origin, 0, y, fd / 2 + 0.035, fw - 0.2, height, "+z", undefined, "receive");
  placePlane(bucket, back.name, back, origin, 0, y, -fd / 2 - 0.035, fw - 0.2, height, "-z", undefined, "receive");
  placePlane(bucket, side.name, side, origin, fw / 2 + 0.035, y, 0, fd - 0.2, height, "+x", undefined, "receive");
  placePlane(bucket, side.name, side, origin, -fw / 2 - 0.035, y, 0, fd - 0.2, height, "-x", undefined, "receive");
  if (roof === "flat") {
    flatRoof(draft, origin, fw, fd, plinth + wallH, colorIndex + floors, hash01(x, z) > 0.42);
  } else {
    addPitched(draft, origin, fw, fd, plinth + wallH, roof, colorIndex + index, `gable-${colorIndex}`, mats.walls[colorIndex]);
  }
  if (!solar && floors > 1 && (villa ? roof !== "flat" : hash01(x + 3, z) > 0.48)) {
    const slabY = plinth + 3.05;
    const bay = Math.min(fw - 0.9, villa ? 3.4 : 2.6);
    placeBox(bucket, "balcony", mats.concrete, origin, 0, slabY, fd / 2 + 0.48, bay, 0.1, 0.9);
    placeBox(bucket, "rail", mats.glassRail, origin, 0, slabY + 0.48, fd / 2 + 0.9, Math.max(0.8, bay - 0.35), 0.72, 0.04);
  }
  for (const sx of [-1, 1]) {
    placeCylinder(
      bucket,
      "downspout",
      mats.metalDark,
      origin,
      sx * (fw / 2 + 0.04),
      (plinth + wallH) / 2,
      fd / 2 - 0.12,
      0.035,
      0.05,
      wallH - 0.3,
      6,
    );
  }
  if (villa && !solar) {
    placeBox(bucket, "bay", mats.concrete, origin, fw / 2 + 0.2, plinth + 1.65, -0.15, 0.38, 1.45, 1.7);
    placeBox(bucket, "bay-glass", mats.glass, origin, fw / 2 + 0.4, plinth + 1.7, -0.15, 0.04, 1.05, 1.25);
  }
  placeBox(bucket, "porch", mats.cap, origin, 0, plinth + 2.45, fd / 2 + 0.72, Math.min(2.4, fw - 1.2), 0.08, 1.15);
  placeCylinder(bucket, "porch-post", mats.cap, origin, -0.85, 1.25, fd / 2 + 1.15, 0.06, 0.07, 2.3, 6);
  placeCylinder(bucket, "porch-post", mats.cap, origin, 0.85, 1.25, fd / 2 + 1.15, 0.06, 0.07, 2.3, 6);
  const hedgeZ = fd / 2 + 2.05;
  const gate = villa ? 1.6 : 1.15;
  const piece = (fw - gate) / 2 - 0.08;
  if (piece > 0.35) {
    placeBox(bucket, "hedge", mats.hedge, origin, -fw / 2 + piece / 2, 0.32, hedgeZ, piece, villa ? 0.7 : 0.46, 0.32);
    placeBox(bucket, "hedge", mats.hedge, origin, fw / 2 - piece / 2, 0.32, hedgeZ, piece, villa ? 0.7 : 0.46, 0.32);
  }
  placeBox(bucket, "bed", mats.soil, origin, fw * 0.28, 0.07, fd / 2 + 1.45, 1.35, 0.06, 0.7, 0, undefined, "receive");
  placeBox(bucket, "bloom", mats.flower, origin, fw * 0.28, 0.12, fd / 2 + 1.45, 1.15, 0.08, 0.48);
  placeBox(bucket, "drive", mats.asphalt, origin, -fw * 0.18, 0.055, fd / 2 + 1.35, 1.7, 0.03, 2.15, 0, [1, 1.2], "receive");
  const spot = worldPoint(x, z, yaw, fw / 2 - 0.2, fd / 2 + 1.7);
  if (!blocked(spot.x, spot.z, 0.15)) {
    draft.trees.push({ x: spot.x, z: spot.z, s: 0.85 + hash01(x, z) * 0.45, kind: hash01(z, x) > 0.72 ? 1 : 0 });
  }
  const shrub = worldPoint(x, z, yaw, -fw * 0.32, fd / 2 + 1.55);
  if (!blocked(shrub.x, shrub.z, 0.1)) {
    draft.trees.push({ x: shrub.x, z: shrub.z, s: 0.48 + hash01(x + 2, z) * 0.2, kind: 2 });
  }
  draft.footprints.push({ x, z, w: fw + 0.5, d: fd + 0.5 });
}

function addHomes(draft: Draft, block: Block, style: "town" | "villa") {
  addSidewalk(draft, block);
  const innerW = block.w - WALK * 2;
  const innerD = block.d - WALK * 2;
  const unitW = style === "town" ? 5.55 : 6.65;
  const unitD = 7.25;
  const minGap = style === "town" ? 0.42 : 2.15;
  const front = style === "town" ? 2.25 : 2.5;
  const count = Math.floor((innerW + minGap) / (unitW + minGap));
  if (count < 1 || innerW < unitW) return;
  const rowW = count * unitW + (count - 1) * minGap;
  const alley = innerD - front * 2 - unitD * 2;
  const sides = alley >= 2.1 ? (["south", "north"] as const) : (["south"] as const);
  sides.forEach((side, row) => {
    const yaw = side === "south" ? 0 : Math.PI;
    const z =
      side === "south"
        ? block.z + block.d / 2 - WALK - front - unitD / 2
        : block.z - block.d / 2 + WALK + front + unitD / 2;
    for (let i = 0; i < count; i += 1) {
      const x = block.x - rowW / 2 + unitW / 2 + i * (unitW + minGap);
      const solar = style === "villa" && side === "south" && i === 0;
      const roll = hash01(x * 0.2, z * 0.17 + i);
      const floors = solar ? 3 : side === "south" && (i === 0 || i === count - 1) ? 3 : roll > 0.72 ? 3 : 2;
      const roof = solar ? "flat" : roll > 0.66 ? "hip" : roll > 0.3 ? "gable" : "flat";
      const fw = solar ? unitW - 0.1 : unitW - 0.1 - (hash01(x, z) > 0.64 ? 0.42 : 0);
      const fd = solar ? unitD : unitD - (hash01(z, x) > 0.6 ? 0.38 : 0);
      // Second south villa: swap the procedural mass for cottage.glb so it can be reviewed in place.
      const useCottage = style === "villa" && side === "south" && i === 1 && draft.cottage === null;
      if (useCottage) {
        reserveCottageLot(draft, x, z, yaw, fw, fd);
        continue;
      }
      // North villa behind cottage: swap the procedural mass for gpt.glb so it can be reviewed in place.
      const useGpt = style === "villa" && side === "north" && i === 1 && draft.gptBuilding === null;
      if (useGpt) {
        reserveGptLot(draft, x, z, yaw, fw, fd);
        continue;
      }
      addHouse(
        draft,
        x,
        z,
        yaw,
        fw,
        fd,
        floors,
        row * 10 + i + Math.round(block.x),
        roof,
        style === "villa",
        solar,
      );
    }
  });
}

/** Yard and footprint only. The cottage mesh is loaded in React so the GLB stays out of the bake. */
function reserveCottageLot(draft: Draft, x: number, z: number, yaw: number, fw: number, fd: number) {
  const { bucket, mats } = draft;
  const origin = makeOrigin(x, z, yaw);
  const yard = mats.lawns[1];
  placeBox(
    bucket,
    "yard-1",
    yard,
    origin,
    0,
    0.04,
    0.35,
    fw + 2.6,
    0.04,
    fd + 2.5,
    0,
    [2.4, 2.2],
    "receive",
  );
  placeBox(bucket, "plinth", mats.concrete, origin, 0, 0.13, 0, fw + 0.16, 0.22, fd + 0.16, 0, undefined, "receive");
  placeBox(bucket, "hedge", mats.hedge, origin, -fw / 2 + 1.6, 0.32, fd / 2 + 2.05, 3.2, 0.7, 0.32);
  placeBox(bucket, "hedge", mats.hedge, origin, fw / 2 - 1.6, 0.32, fd / 2 + 2.05, 3.2, 0.7, 0.32);
  draft.footprints.push({ x, z, w: fw + 0.5, d: fd + 0.5 });
  draft.cottage = { x, z, yaw, targetW: fw, targetD: fd };
}

/** Footprint and yard only. The gpt.glb building is loaded in React so the GLB stays out of the bake. */
function reserveGptLot(draft: Draft, x: number, z: number, yaw: number, fw: number, fd: number) {
  const { bucket, mats } = draft;
  const origin = makeOrigin(x, z, yaw);
  const yard = mats.lawns[1];
  placeBox(
    bucket,
    "yard-1",
    yard,
    origin,
    0,
    0.04,
    0.35,
    fw + 2.6,
    0.04,
    fd + 2.5,
    0,
    [2.4, 2.2],
    "receive",
  );
  placeBox(bucket, "plinth", mats.concrete, origin, 0, 0.1, 0, fw + 0.16, 0.18, fd + 0.16, 0, undefined, "receive");
  draft.footprints.push({ x, z, w: fw + 0.5, d: fd + 0.5 });
  draft.gptBuilding = { x, z, yaw, targetW: fw, targetD: fd };
}

function addTower(draft: Draft, block: Block) {
  addSidewalk(draft, block);
  const { bucket, mats } = draft;
  const podiumW = 12.2;
  const podiumD = 18.4;
  const origin = makeOrigin(block.x, block.z, 0);
  placeBox(bucket, "plaza", mats.stone, origin, 0, 0.05, 0, podiumW, 0.08, podiumD, 0, [4, 5], "receive");
  placeBox(bucket, "planter", mats.concrete, origin, podiumW / 2 - 1.3, 0.32, podiumD / 2 - 1.2, 2.1, 0.5, 0.7);
  placeBox(bucket, "planter-hedge", mats.hedge, origin, podiumW / 2 - 1.3, 0.68, podiumD / 2 - 1.2, 1.9, 0.32, 0.5);
  draft.footprints.push({ x: block.x, z: block.z, w: podiumW + 1.2, d: podiumD + 1.2 });
  draft.trees.push({ x: block.x - 4.6, z: block.z + 7.2, s: 1.2, kind: 0 });
  draft.trees.push({ x: block.x + 4.8, z: block.z + 6.4, s: 1.05, kind: 1 });
  draft.skyscraper = { x: block.x, z: block.z, yaw: 0, targetW: podiumW, targetD: podiumD };
}

const ASSET_FOR_KIND: Partial<Record<Block["kind"], ModelKey>> = {
  officeMidrise: "officeMidrise",
  apartment: "apartmentBlock",
  commercial: "commercialComplex",
  school: "citySchool",
  hospital: "cityHospital",
  library: "publicLibrary",
  landmark: "skyscraper",
};

/** Plaza + footprint for a GLB building. Flat roof field stays clear for later solar. */
function addAssetBuilding(draft: Draft, block: Block, asset: ModelKey) {
  addSidewalk(draft, block);
  const { bucket, mats } = draft;
  const margin = asset === "skyscraper" ? 2.4 : 3.2;
  const fw = Math.max(8, Math.min(block.w - margin, asset === "citySchool" ? 28 : asset === "skyscraper" ? 14 : 22));
  const fd = Math.max(8, Math.min(block.d - margin, asset === "skyscraper" ? 16 : 18));
  const yaw = hash01(block.x, block.z) > 0.55 ? Math.PI / 2 : 0;
  const placedW = yaw === 0 ? fw : fd;
  const placedD = yaw === 0 ? fd : fw;
  const origin = makeOrigin(block.x, block.z, 0);
  placeBox(
    bucket,
    "plaza",
    mats.stone,
    origin,
    0,
    0.05,
    0,
    Math.min(block.w - 1.2, placedW + 3.4),
    0.07,
    Math.min(block.d - 1.2, placedD + 3.2),
    0,
    [4, 4],
    "receive",
  );
  placeBox(bucket, "planter", mats.concrete, origin, placedW / 2 + 0.4, 0.28, placedD / 2 + 0.2, 1.6, 0.42, 0.55);
  placeBox(bucket, "planter-hedge", mats.hedge, origin, placedW / 2 + 0.4, 0.58, placedD / 2 + 0.2, 1.4, 0.28, 0.4);
  draft.footprints.push({ x: block.x, z: block.z, w: placedW + 1.4, d: placedD + 1.4 });
  draft.props.push({
    asset,
    x: block.x,
    z: block.z,
    yaw,
    targetW: placedW,
    targetD: placedD,
    fit: asset === "skyscraper" ? 0.62 : 0.86,
  });
  const treeKind = asset === "citySchool" || asset === "publicLibrary" ? 0 : hash01(block.z, block.x) > 0.5 ? 1 : 2;
  plant(draft, block.x - placedW * 0.42, block.z + placedD * 0.42, 1.1 + hash01(block.x, 1) * 0.4, treeKind);
  plant(draft, block.x + placedW * 0.4, block.z + placedD * 0.38, 1 + hash01(block.z, 2) * 0.35, treeKind === 1 ? 0 : 1);
}

function addOffice(draft: Draft, block: Block) {
  addSidewalk(draft, block);
  const { bucket, mats } = draft;
  const fw = 9.6;
  const fd = 12.2;
  const floors = 7;
  const floorH = 3.2;
  const wallH = floors * floorH;
  const z = block.z - 1.6;
  const origin = makeOrigin(block.x, z, 0);
  placeBox(bucket, "plaza", mats.stone, origin, 0, 0.045, fd / 2 + 3.3, fw + 1.2, 0.06, 5.4, 0, [3, 2], "receive");
  placeBox(bucket, "office-mass", mats.concrete, origin, 0, wallH / 2 + 0.12, 0, fw, wallH, fd);
  const south = mats.curtain({ id: "office-south", width: fw - 0.2, height: wallH, floors });
  const west = mats.curtain({ id: "office-west", width: fd - 0.2, height: wallH, floors });
  const y = wallH / 2 + 0.12;
  placePlane(bucket, "office-s", south, origin, 0, y, fd / 2 + 0.04, fw - 0.2, wallH, "+z", undefined, "receive");
  placePlane(bucket, "office-n", south, origin, 0, y, -fd / 2 - 0.04, fw - 0.2, wallH, "-z", undefined, "receive");
  placePlane(bucket, "office-e", west, origin, fw / 2 + 0.04, y, 0, fd - 0.2, wallH, "+x", undefined, "receive");
  placePlane(bucket, "office-w", west, origin, -fw / 2 - 0.04, y, 0, fd - 0.2, wallH, "-x", undefined, "receive");
  for (let i = 0; i < 6; i += 1) {
    const lx = -fw / 2 + 0.9 + i * ((fw - 1.8) / 5);
    placeBox(bucket, "mullion", mats.cap, origin, lx, y, fd / 2 + 0.1, 0.08, wallH * 0.96, 0.1);
  }
  for (let floor = 1; floor < floors; floor += 1) {
    const bandY = floor * floorH;
    placeBox(bucket, "spandrel", mats.cap, origin, 0, bandY, fd / 2 + 0.08, fw + 0.06, 0.14, 0.1);
    placeBox(bucket, "spandrel", mats.cap, origin, 0, bandY, -fd / 2 - 0.08, fw + 0.06, 0.14, 0.1);
  }
  placeBox(bucket, "entry-canopy", mats.cap, origin, 0, 3.6, fd / 2 + 0.9, 4.6, 0.1, 1.5);
  const roofY = flatRoof(draft, origin, fw, fd, wallH + 0.12, 0, false);
  placeBox(bucket, "hvac", mats.hvac, origin, fw / 2 - 1.6, roofY + 0.45, -fd / 2 + 1.5, 2.1, 0.85, 1.5);
  placeBox(bucket, "hvac", mats.hvac, origin, fw / 2 - 1.45, roofY + 0.28, -fd / 2 + 3.2, 1.3, 0.5, 1.1);
  placeCylinder(bucket, "vent", mats.metalDark, origin, -fw / 2 + 1.1, roofY + 0.35, fd / 2 - 1.2, 0.16, 0.2, 0.55, 8);
  const wingH = 3 * floorH;
  const wingZ = z + fd / 2 + 4.4;
  const wing = makeOrigin(block.x, wingZ, 0);
  const wingBase = 0.12;
  placeBox(bucket, "wing-mass", mats.concrete, wing, 0, wingBase + wingH / 2, 0, fw - 1.4, wingH, 6.4);
  const wingFront = mats.curtain({ id: "office-wing", width: fw - 1.6, height: wingH, floors: 3 });
  const wingSide = mats.curtain({ id: "office-wing-side", width: 6.2, height: wingH, floors: 3 });
  placePlane(bucket, "wing-s", wingFront, wing, 0, wingBase + wingH / 2, 3.24, fw - 1.6, wingH, "+z", undefined, "receive");
  placePlane(bucket, "wing-n", wingFront, wing, 0, wingBase + wingH / 2, -3.24, fw - 1.6, wingH, "-z", undefined, "receive");
  placePlane(bucket, "wing-e", wingSide, wing, (fw - 1.4) / 2 + 0.04, wingBase + wingH / 2, 0, 6.2, wingH, "+x", undefined, "receive");
  placePlane(bucket, "wing-w", wingSide, wing, -(fw - 1.4) / 2 - 0.04, wingBase + wingH / 2, 0, 6.2, wingH, "-x", undefined, "receive");
  flatRoof(draft, wing, fw - 1.4, 6.4, wingBase + wingH, 2, true);
  draft.footprints.push({ x: block.x, z, w: fw + 0.8, d: fd + 0.8 });
  draft.footprints.push({ x: block.x, z: wingZ, w: fw, d: 6.8 });
  draft.trees.push({ x: block.x - 4.2, z: z + fd / 2 + 2.2, s: 1.15, kind: 0 });
  draft.trees.push({ x: block.x + 4.1, z: z + fd / 2 + 2.5, s: 0.9, kind: 2 });
}

function addCivic(draft: Draft, block: Block) {
  addSidewalk(draft, block);
  const { bucket, mats } = draft;
  const fw = 11.3;
  const fd = 9.4;
  const floors = 2;
  const floorH = 4.05;
  const wallH = floors * floorH;
  const z = block.z + block.d / 2 - WALK - 3.9 - fd / 2;
  const origin = makeOrigin(block.x, z, 0);
  placeBox(bucket, "plinth", mats.stone, origin, 0, 0.28, 0, fw + 0.4, 0.46, fd + 0.3, 0, undefined, "receive");
  placeBox(bucket, "civic-mass", mats.walls[0], origin, 0, 0.46 + wallH / 2, 0, fw, wallH, fd);
  const front = mats.house({
    id: "civic-front",
    width: fw - 0.3,
    height: wallH,
    floors,
    wall: WALLS[0],
    door: true,
  });
  const back = mats.house({
    id: "civic-back",
    width: fw - 0.3,
    height: wallH,
    floors,
    wall: WALLS[0],
    door: false,
  });
  const side = mats.house({
    id: "civic-side",
    width: fd - 0.3,
    height: wallH,
    floors,
    wall: WALLS[0],
    door: false,
  });
  const y = 0.46 + wallH / 2;
  placePlane(bucket, "civic-s", front, origin, 0, y, fd / 2 + 0.04, fw - 0.3, wallH, "+z", undefined, "receive");
  placePlane(bucket, "civic-n", back, origin, 0, y, -fd / 2 - 0.04, fw - 0.3, wallH, "-z", undefined, "receive");
  placePlane(bucket, "civic-e", side, origin, fw / 2 + 0.04, y, 0, fd - 0.3, wallH, "+x", undefined, "receive");
  placePlane(bucket, "civic-w", side, origin, -fw / 2 - 0.04, y, 0, fd - 0.3, wallH, "-x", undefined, "receive");
  const span = fw - 1.8;
  for (let i = 0; i < 5; i += 1) {
    const lx = -span / 2 + (span * i) / 4;
    placeCylinder(bucket, "column", mats.stone, origin, lx, wallH * 0.46, fd / 2 + 1.15, 0.3, 0.36, wallH * 0.78, 10);
  }
  placeBox(bucket, "entablature", mats.stone, origin, 0, wallH * 0.9, fd / 2 + 1.15, span + 1.1, 0.46, 1.25);
  for (let step = 0; step < 3; step += 1) {
    placeBox(
      bucket,
      "steps",
      mats.stone,
      origin,
      0,
      0.08 + step * 0.08,
      fd / 2 + 1.85 + step * 0.42,
      fw - 0.4,
      0.1,
      0.46,
      0,
      undefined,
      "receive",
    );
  }
  addPitched(draft, origin, fw, fd, 0.46 + wallH, "hip", 1, "gable-civic", mats.walls[0]);
  placeBox(bucket, "cupola", mats.stone, origin, 0, 0.46 + wallH + 1.15, 0, 2.2, 1.5, 2.2);
  placeBox(bucket, "cupola-cap", mats.slate, origin, 0, 0.46 + wallH + 2.05, 0, 2.6, 0.28, 2.6);
  draft.footprints.push({ x: block.x, z, w: fw + 1.2, d: fd + 5.2 });
}

function addWarehouse(draft: Draft, block: Block, variant: number) {
  addSidewalk(draft, block);
  const { bucket, mats } = draft;
  const innerW = block.w - 2.2;
  const innerD = block.d - 2.2;
  placeBox(
    bucket,
    "apron",
    mats.concrete,
    IDENTITY,
    block.x,
    0.05,
    block.z,
    innerW,
    0.08,
    innerD,
    0,
    [innerW / 4, innerD / 4],
    "receive",
  );
  const fw = 11.2;
  const fd = Math.min(22.4, innerD - 1);
  const wallH = 6.2;
  const x = block.x - block.w / 2 + 1.2 + 4.3 + fw / 2;
  const origin = makeOrigin(x, block.z, 0);
  placeBox(bucket, "wh-plinth", mats.concrete, origin, 0, 0.16, 0, fw + 0.16, 0.28, fd + 0.12, 0, undefined, "receive");
  const wallColor = variant % 2 === 0 ? "#ddd8d0" : "#d0d4d8";
  placeBox(bucket, "wh-mass", mats.concrete, origin, 0, 0.3 + wallH / 2, 0, fw, wallH, fd);
  const docks = mats.industrial({
    id: `wh-${variant}-docks-${fd.toFixed(1)}`,
    width: fd - 0.25,
    height: wallH,
    docks: true,
    wall: wallColor,
  });
  const longPlain = mats.industrial({
    id: `wh-${variant}-long-${fd.toFixed(1)}`,
    width: fd - 0.25,
    height: wallH,
    docks: false,
    wall: wallColor,
  });
  const endPlain = mats.industrial({
    id: `wh-${variant}-end-${fw.toFixed(1)}`,
    width: fw - 0.25,
    height: wallH,
    docks: false,
    wall: wallColor,
  });
  const y = 0.3 + wallH / 2;
  placePlane(bucket, docks.name, docks, origin, -fw / 2 - 0.04, y, 0, fd - 0.25, wallH, "-x", undefined, "receive");
  placePlane(bucket, longPlain.name, longPlain, origin, fw / 2 + 0.04, y, 0, fd - 0.25, wallH, "+x", undefined, "receive");
  placePlane(bucket, endPlain.name, endPlain, origin, 0, y, fd / 2 + 0.04, fw - 0.25, wallH, "+z", undefined, "receive");
  placePlane(bucket, endPlain.name, endPlain, origin, 0, y, -fd / 2 - 0.04, fw - 0.25, wallH, "-z", undefined, "receive");
  const metal = variant % 2 === 0 ? mats.metal : mats.metalDark;
  const lift = 0.3 + wallH;
  placeGable(bucket, variant % 2 === 0 ? "gable" : "gable-dark", metal, origin, fd, fw, 2.4, 0.48, lift);
  placeGableEnds(bucket, "gable-end", mats.gable, origin, fd, fw, 2.4, lift);
  placeBox(bucket, "ridge", mats.cap, origin, 0, lift + 2.42, 0, 0.26, 0.12, fd + 1.05);
  placeBox(bucket, "gutter", mats.metalDark, origin, fw / 2 + 0.2, lift + 0.08, 0, 0.12, 0.1, fd + 0.6);
  placeBox(bucket, "gutter", mats.metalDark, origin, -fw / 2 - 0.2, lift + 0.08, 0, 0.12, 0.1, fd + 0.6);
  placeBox(bucket, "skylight", mats.glass, origin, 1.15, lift + 1.25, 0, 1.35, 0.08, fd * 0.42);
  placeBox(bucket, "dock-canopy", mats.metalDark, origin, -fw / 2 - 1.15, lift - 0.55, 0, 2.3, 0.08, fd * 0.62);
  for (const sz of [-fd * 0.22, fd * 0.22]) {
    placeCylinder(bucket, "dock-post", mats.concrete, origin, -fw / 2 - 2.05, 2.3, sz, 0.1, 0.12, 4.4, 6);
  }
  addTruck(draft, x - fw / 2 - 2.35, block.z - 4.2);
  addTruck(draft, x - fw / 2 - 2.35, block.z + 4.6);
  draft.footprints.push({ x, z: block.z, w: fw + 1, d: fd + 1 });
}

function addTruck(draft: Draft, x: number, z: number) {
  const { bucket, mats } = draft;
  const origin = makeOrigin(x, z, 0);
  placeBox(bucket, "trailer", mats.cap, origin, 0, 1.55, -0.4, 2.25, 2.35, 6.1);
  placeBox(bucket, "trailer-rib", mats.metalDark, origin, 0, 2.75, -0.4, 2.28, 0.08, 6.15);
  placeBox(bucket, "cab", mats.concrete, origin, 0, 1.15, 3.35, 2.1, 1.35, 2.15);
  placeBox(bucket, "cab-top", mats.concrete, origin, 0, 2.05, 3.05, 1.95, 0.85, 1.35);
  placeBox(bucket, "windshield", mats.glass, origin, 0, 1.95, 3.75, 1.7, 0.55, 0.06);
  for (const side of [-1, 1]) {
    for (const end of [2.6, -0.2, -2.4]) {
      placeCylinder(bucket, "truck-wheel", mats.lampPole, origin, side * 1.05, 0.38, end, 0.36, 0.36, 0.22, 10, 0, 0, Math.PI / 2);
    }
  }
  draft.footprints.push({ x, z, w: 2.8, d: 9.2 });
}

function addTanks(draft: Draft, block: Block) {
  addSidewalk(draft, block);
  const { bucket, mats } = draft;
  const innerW = block.w - 2.4;
  const innerD = block.d - 2.4;
  placeBox(
    bucket,
    "tank-pad",
    mats.concrete,
    IDENTITY,
    block.x,
    0.05,
    block.z,
    innerW,
    0.08,
    innerD,
    0,
    undefined,
    "receive",
  );
  const specs = [
    { r: 2.05, h: 6.8 },
    { r: 1.65, h: 9.1 },
    { r: 1.9, h: 5.9 },
    { r: 1.5, h: 7.6 },
  ];
  const gap = innerW / specs.length;
  specs.forEach((tank, index) => {
    const x = block.x - innerW / 2 + gap * (index + 0.5);
    const origin = makeOrigin(x, block.z, 0);
    placeCylinder(bucket, "tank", mats.metal, origin, 0, tank.h / 2 + 0.1, 0, tank.r, tank.r, tank.h, 20);
    placeSphere(bucket, "dome", mats.metal, origin, 0, tank.h + 0.05, 0, tank.r * 0.98, tank.r * 0.4, tank.r * 0.98);
    draft.footprints.push({ x, z: block.z, w: tank.r * 2.3, d: tank.r * 2.3 });
  });
  const origin = makeOrigin(block.x, block.z, 0);
  placeCylinder(bucket, "pipe", mats.metalDark, origin, 0, 1.45, 0.2, 0.14, 0.14, innerW * 0.7, 8, 0, 0, Math.PI / 2);
  placeBox(bucket, "bund", mats.concrete, origin, 0, 0.28, innerD * 0.42, innerW * 0.92, 0.45, 0.18);
  placeBox(bucket, "bund", mats.concrete, origin, 0, 0.28, -innerD * 0.42, innerW * 0.92, 0.45, 0.18);
  placeBox(bucket, "catwalk", mats.metalDark, origin, 0, 1.15, 0, innerW * 0.72, 0.06, 0.7);
  placeBox(bucket, "container", mats.metalDark, origin, -innerW * 0.22, 1.15, innerD * 0.28, 2.3, 2.25, 5.6);
  placeBox(bucket, "container", mats.cap, origin, innerW * 0.18, 1.15, innerD * 0.28, 2.3, 2.25, 5.8);
  placeBox(bucket, "container-rib", mats.metal, origin, innerW * 0.18, 2.25, innerD * 0.28, 2.32, 0.06, 5.8);
}

function addPark(draft: Draft, block: Block) {
  addSidewalk(draft, block);
  const { bucket, mats } = draft;
  const innerW = Math.max(1, block.w - WALK * 2);
  const innerD = Math.max(1, block.d - WALK * 2);
  placeBox(
    bucket,
    "path",
    mats.walk,
    IDENTITY,
    block.x,
    0.06,
    block.z,
    innerW * 0.72,
    0.04,
    1.35,
    0,
    [innerW / 3, 0.8],
    "receive",
  );
  placeBox(
    bucket,
    "path",
    mats.walk,
    IDENTITY,
    block.x + innerW * 0.08,
    0.06,
    block.z,
    1.2,
    0.04,
    innerD * 0.62,
    0,
    [0.6, innerD / 3],
    "receive",
  );
  placeBox(bucket, "bed", mats.soil, IDENTITY, block.x - innerW * 0.22, 0.07, block.z + innerD * 0.18, 2.4, 0.06, 1.3, 0, undefined, "receive");
  placeBox(bucket, "bloom", mats.flower, IDENTITY, block.x - innerW * 0.22, 0.12, block.z + innerD * 0.18, 2.1, 0.08, 1.05);
  placeBox(bucket, "hedge", mats.hedge, IDENTITY, block.x, 0.28, block.z - innerD * 0.28, innerW * 0.55, 0.4, 0.35);
  draft.footprints.push({ x: block.x, z: block.z, w: innerW * 0.7, d: 1.8 });
  if (block.w > 20 && block.d > 10) {
    const origin = makeOrigin(block.x, block.z - 1.5, 0);
    placeCylinder(bucket, "fountain", mats.stone, origin, 0, 0.28, 0, 2.25, 2.45, 0.42, 24);
    placeCylinder(bucket, "basin", mats.basin, origin, 0, 0.42, 0, 1.85, 1.85, 0.12, 20);
    draft.footprints.push({ x: block.x, z: block.z - 1.5, w: 5.4, d: 5.4 });
    return;
  }
  if (block.x < -40 && block.z < 0 && innerW > 8 && innerD > 8) {
    const pw = 6.2;
    const pd = 4;
    const origin = makeOrigin(block.x, block.z + 1.2, 0);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        placeCylinder(
          bucket,
          "post",
          mats.concrete,
          origin,
          sx * (pw / 2 - 0.25),
          1.35,
          sz * (pd / 2 - 0.25),
          0.07,
          0.08,
          2.6,
          6,
        );
      }
    }
    placeBox(bucket, "shelter", mats.cap, origin, 0, 2.68, 0, pw, 0.12, pd);
    draft.footprints.push({ x: block.x, z: block.z + 1.2, w: pw + 0.6, d: pd + 0.6 });
  }
}

function addParking(draft: Draft, block: Block) {
  addSidewalk(draft, block);
  const { bucket, mats } = draft;
  const innerW = block.w - WALK * 2;
  const innerD = block.d - WALK * 2;
  placeBox(
    bucket,
    "lot",
    mats.asphalt,
    IDENTITY,
    block.x,
    0.05,
    block.z,
    innerW,
    0.07,
    innerD,
    0,
    [innerW / 4, innerD / 4],
    "receive",
  );
  const stallW = 2.48;
  const stallD = 4.85;
  const cols = Math.max(1, Math.floor((innerW - 0.6) / stallW));
  const rows = Math.max(1, Math.floor((innerD - 0.4) / stallD));
  const gridW = cols * stallW;
  const gridD = rows * stallD;
  const x0 = block.x - gridW / 2;
  const z0 = block.z - gridD / 2;
  for (let col = 0; col <= cols; col += 1) {
    placeBox(bucket, "stall", mats.marking, IDENTITY, x0 + col * stallW, MARK_Y, block.z, 0.08, 0.012, gridD, 0, undefined, "receive");
  }
  for (let row = 0; row <= rows; row += 1) {
    placeBox(bucket, "stall", mats.marking, IDENTITY, block.x, MARK_Y, z0 + row * stallD, gridW, 0.012, 0.08, 0, undefined, "receive");
  }
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (hash01(block.x + col, block.z + row) > 0.8) continue;
      draft.cars.push({
        x: x0 + stallW * (col + 0.5),
        z: z0 + stallD * (row + 0.5),
        yaw: row % 2 === 0 ? 0 : Math.PI,
        color: Math.floor(hash01(col + 2, row + 4) * PAINTS.length) % PAINTS.length,
        y: 0.1,
      });
    }
  }
}

function nearJunction(x: number, z: number, pad: number) {
  return intersections().some(
    (cross) => Math.abs(x - cross.x) <= cross.w / 2 + pad && Math.abs(z - cross.z) <= cross.d / 2 + pad,
  );
}

function addRoads(draft: Draft) {
  const { bucket, mats } = draft;
  const crosses = intersections();
  roads.forEach((road) => {
    const horizontal = road.w >= road.d;
    placeBox(
      bucket,
      "asphalt",
      mats.asphalt,
      IDENTITY,
      road.x,
      ROAD_Y,
      road.z,
      road.w,
      ROAD_H,
      road.d,
      0,
      [road.w / 4, road.d / 4],
      "receive",
    );
    if (horizontal) {
      const x0 = road.x - road.w / 2;
      const x1 = road.x + road.w / 2;
      for (let x = x0 + 2; x < x1 - 1.2; x += 3.6) {
        if (nearJunction(x, road.z, 1.4)) continue;
        placeBox(bucket, "dash", mats.marking, IDENTITY, x, MARK_Y, road.z, 1.5, 0.012, 0.12, 0, undefined, "receive");
      }
      for (const side of [-1, 1]) {
        const z = road.z + side * (road.d / 2 - 0.32);
        for (let x = x0 + 2.2; x < x1 - 1.4; x += 4.2) {
          if (nearJunction(x, road.z, 0.8)) continue;
          placeBox(bucket, "edge", mats.marking, IDENTITY, x, MARK_Y, z, 3.6, 0.01, 0.09, 0, undefined, "receive");
        }
      }
    } else {
      const z0 = road.z - road.d / 2;
      const z1 = road.z + road.d / 2;
      for (let z = z0 + 2; z < z1 - 1.2; z += 3.6) {
        if (nearJunction(road.x, z, 1.4)) continue;
        placeBox(bucket, "dash", mats.marking, IDENTITY, road.x, MARK_Y, z, 0.12, 0.012, 1.5, 0, undefined, "receive");
      }
      for (const side of [-1, 1]) {
        const x = road.x + side * (road.w / 2 - 0.32);
        for (let z = z0 + 2.2; z < z1 - 1.4; z += 4.2) {
          if (nearJunction(road.x, z, 0.8)) continue;
          placeBox(bucket, "edge", mats.marking, IDENTITY, x, MARK_Y, z, 0.09, 0.01, 3.6, 0, undefined, "receive");
        }
      }
    }
  });
  crosses.forEach((cross) => {
    const northRoom = cross.vertical.z + cross.vertical.d / 2 - (cross.z + cross.d / 2);
    const southRoom = cross.z - cross.d / 2 - (cross.vertical.z - cross.vertical.d / 2);
    const eastRoom = cross.horizontal.x + cross.horizontal.w / 2 - (cross.x + cross.w / 2);
    const westRoom = cross.x - cross.w / 2 - (cross.horizontal.x - cross.horizontal.w / 2);
    if (northRoom > 2.2) {
      for (let i = 0; i < 5; i += 1) {
        const z = cross.z + cross.d / 2 + 0.5 + i * 0.7;
        if (z > cross.vertical.z + cross.vertical.d / 2 - 0.3) break;
        placeBox(bucket, "cross", mats.marking, IDENTITY, cross.x, MARK_Y, z, Math.max(1, cross.w - 1.2), 0.012, 0.34, 0, undefined, "receive");
      }
    }
    if (southRoom > 2.2) {
      for (let i = 0; i < 5; i += 1) {
        const z = cross.z - cross.d / 2 - 0.5 - i * 0.7;
        if (z < cross.vertical.z - cross.vertical.d / 2 + 0.3) break;
        placeBox(bucket, "cross", mats.marking, IDENTITY, cross.x, MARK_Y, z, Math.max(1, cross.w - 1.2), 0.012, 0.34, 0, undefined, "receive");
      }
    }
    if (eastRoom > 2.2) {
      for (let i = 0; i < 5; i += 1) {
        const x = cross.x + cross.w / 2 + 0.5 + i * 0.7;
        if (x > cross.horizontal.x + cross.horizontal.w / 2 - 0.3) break;
        placeBox(bucket, "cross", mats.marking, IDENTITY, x, MARK_Y, cross.z, 0.34, 0.012, Math.max(1, cross.d - 1.2), 0, undefined, "receive");
      }
    }
    if (westRoom > 2.2) {
      for (let i = 0; i < 5; i += 1) {
        const x = cross.x - cross.w / 2 - 0.5 - i * 0.7;
        if (x < cross.horizontal.x - cross.horizontal.w / 2 + 0.3) break;
        placeBox(bucket, "cross", mats.marking, IDENTITY, x, MARK_Y, cross.z, 0.34, 0.012, Math.max(1, cross.d - 1.2), 0, undefined, "receive");
      }
    }
  });
}

function addSpan(draft: Draft, rect: Rect, railHeight: number) {
  const { bucket, mats } = draft;
  const top = 0.112;
  const thick = 0.22;
  placeBox(
    bucket,
    "bridge",
    mats.asphalt,
    IDENTITY,
    rect.x,
    top - thick / 2,
    rect.z,
    rect.w,
    thick,
    rect.d,
    0,
    [rect.w / 4, rect.d / 3],
    "both",
  );
  const posts = Math.max(3, Math.round(rect.w / 2.3));
  for (let i = 0; i < posts; i += 1) {
    const x = rect.x - rect.w / 2 + 0.3 + ((rect.w - 0.6) * i) / Math.max(1, posts - 1);
    for (const side of [-1, 1]) {
      const z = rect.z + side * (rect.d / 2 + 0.04);
      placeBox(bucket, "rail-post", mats.metalDark, IDENTITY, x, top + railHeight / 2, z, 0.08, railHeight, 0.08);
    }
  }
  for (const side of [-1, 1]) {
    const z = rect.z + side * (rect.d / 2 + 0.04);
    placeBox(bucket, "handrail", mats.metalDark, IDENTITY, rect.x, top + railHeight - 0.05, z, rect.w - 0.2, 0.06, 0.08);
  }
  placeBox(bucket, "edge", mats.marking, IDENTITY, rect.x, MARK_Y + 0.012, rect.z + rect.d / 2 - 0.28, rect.w * 0.92, 0.01, 0.08, 0, undefined, "receive");
  placeBox(bucket, "edge", mats.marking, IDENTITY, rect.x, MARK_Y + 0.012, rect.z - rect.d / 2 + 0.28, rect.w * 0.92, 0.01, 0.08, 0, undefined, "receive");
}

function addCanal(draft: Draft) {
  const samples = canalSamples(draft.quality === "high" ? 2.1 : 3.3);
  const skip = (z: number) => Math.abs(z) < 4.2 || Math.abs(z + 20) < 2.25;
  const { bucket, mats } = draft;
  for (const side of [-1, 1]) {
    const edge = side * CANAL_HALF;
    placeCanalStrip(bucket, "canal-wall", mats.waterWall, samples, edge, edge, -0.62, 0.08, skip, "receive");
    placeCanalStrip(
      bucket,
      "coping",
      mats.quay,
      samples,
      side * (CANAL_HALF - 0.02),
      side * (CANAL_HALF + 1.05),
      0.1,
      0.1,
      skip,
      "receive",
    );
    placeCanalStrip(
      bucket,
      "promenade",
      mats.walk,
      samples,
      side * (CANAL_HALF + 1.05),
      side * (CANAL_HALF + 3.2),
      0.118,
      0.118,
      skip,
      "receive",
    );
    placeCanalStrip(
      bucket,
      "bank",
      mats.grass,
      samples,
      side * (CANAL_HALF + 3.2),
      side * (CANAL_HALF + 5.6),
      0.04,
      0.02,
      skip,
      "receive",
    );
    placeCanalStrip(
      bucket,
      "reeds",
      mats.hedge,
      samples,
      side * (CANAL_HALF - 0.15),
      side * (CANAL_HALF + 0.35),
      0.16,
      0.22,
      (z) => skip(z) || hash01(side, z) > 0.55,
      "none",
    );
  }
  addSpan(draft, BRIDGE, 0.92);
  addSpan(draft, FOOTBRIDGE, 0.72);
  const cx = canalX(0);
  placeBox(bucket, "pier", mats.concrete, IDENTITY, cx - 3.4, -0.46, 0, 0.9, 0.72, 2.3);
  placeBox(bucket, "pier", mats.concrete, IDENTITY, cx + 3.4, -0.46, 0, 0.9, 0.72, 2.3);
  const foot = canalX(-20);
  placeBox(bucket, "pier", mats.concrete, IDENTITY, foot, -0.42, -20, 0.7, 0.64, 1.5);
}

function plant(draft: Draft, x: number, z: number, s: number, kind = -1) {
  if (blocked(x, z, 0.35)) return;
  if (draft.footprints.some((spot) => rectContains(spot, x, z, 0.25))) return;
  // Wider spacing keeps sidewalks readable and cuts crowded clusters.
  const min = kind === 2 ? 1.8 : 4.4;
  if (draft.trees.some((tree) => (tree.x - x) ** 2 + (tree.z - z) ** 2 < min * min)) return;
  const resolved = kind < 0 ? (hash01(x, z) > 0.74 ? 1 : hash01(z, x) > 0.86 ? 2 : 0) : kind;
  // Map to the three GLB silhouettes only (broad / evergreen / ornamental).
  const kind3 = resolved === 3 ? 0 : resolved;
  draft.trees.push({ x, z, s, kind: kind3 });
}

/** Deterministic keep of ~50% after scatter, preferring evenly spaced survivors. */
function thinTrees(draft: Draft, keep = 0.5) {
  if (draft.trees.length === 0) return;
  const scored = draft.trees
    .map((tree, index) => ({
      tree,
      score: hash01(tree.x * 1.73 + index * 0.11, tree.z * 2.09 + 4.1),
    }))
    .sort((a, b) => a.score - b.score);
  const count = Math.max(8, Math.round(draft.trees.length * keep));
  const kept: TreeSpot[] = [];
  for (const entry of scored) {
    if (kept.length >= count) break;
    const min = entry.tree.kind === 2 ? 2.2 : 5.2;
    if (kept.some((tree) => (tree.x - entry.tree.x) ** 2 + (tree.z - entry.tree.z) ** 2 < min * min)) continue;
    kept.push(entry.tree);
  }
  // If spacing culls too aggressively, top up from remaining scores.
  if (kept.length < count * 0.85) {
    for (const entry of scored) {
      if (kept.length >= count) break;
      if (kept.includes(entry.tree)) continue;
      kept.push(entry.tree);
    }
  }
  draft.trees = kept;
}

function scatterTrees(draft: Draft) {
  const step = draft.quality === "high" ? 14.5 : 18;
  roads.forEach((road) => {
    const horizontal = road.w >= road.d;
    if (horizontal) {
      const x0 = road.x - road.w / 2 + 4;
      const x1 = road.x + road.w / 2 - 3;
      for (let x = x0; x < x1; x += step) {
        if (hash01(x, road.z) < 0.38) continue;
        const jitter = (hash01(x, road.z + 4) - 0.5) * 2.6;
        plant(draft, x + jitter, road.z + road.d / 2 + 0.85, 1.15 + hash01(x, road.z) * 0.7);
        if (hash01(x, -road.z) > 0.55) {
          plant(draft, x + step * 0.42, road.z - road.d / 2 - 0.9, 1.05 + hash01(x, -road.z) * 0.65);
        }
      }
    } else {
      const z0 = road.z - road.d / 2 + 4;
      const z1 = road.z + road.d / 2 - 3;
      for (let z = z0; z < z1; z += step) {
        if (hash01(road.x, z) < 0.36) continue;
        const jitter = (hash01(road.x + 3, z) - 0.5) * 2.2;
        plant(draft, road.x + road.w / 2 + 0.85, z + jitter, 1.2 + hash01(road.x, z) * 0.7);
        if (hash01(-road.x, z) > 0.58) {
          plant(draft, road.x - road.w / 2 - 0.9, z + step * 0.37, 1.05 + hash01(-road.x, z) * 0.6);
        }
      }
    }
  });
  const canalStep = draft.quality === "high" ? 14 : 18;
  for (let z = -72; z <= 68; z += canalStep) {
    const x = canalX(z);
    const wave = Math.sin(z * 0.35) * 1.4;
    plant(draft, x - CANAL_HALF - 4.6 + wave, z, 1.35 + hash01(x, z) * 0.85, hash01(z, 2) > 0.6 ? 1 : 0);
    if (hash01(z, 9) > 0.42) {
      plant(draft, x + CANAL_HALF + 4.7 - wave * 0.4, z + 2.4, 1.25 + hash01(z, x) * 0.8, hash01(z, 9) > 0.55 ? 1 : 0);
    }
  }
  blocks
    .filter((block) => block.kind === "park")
    .forEach((block) => {
      const w = block.w - WALK * 2;
      const d = block.d - WALK * 2;
      const groves = draft.quality === "high" ? 3 : 2;
      for (let g = 0; g < groves; g += 1) {
        const cx = block.x + (hash01(block.x + g, block.z) - 0.5) * w * 0.72;
        const cz = block.z + (hash01(block.z, block.x + g * 3) - 0.5) * d * 0.7;
        const count = 2 + Math.floor(hash01(g + 2, block.x) * 2);
        for (let i = 0; i < count; i += 1) {
          const angle = hash01(cx + i, cz) * Math.PI * 2;
          const radius = 1.2 + hash01(i, cz + g) * 2.8;
          const kind = hash01(i + g, cx) > 0.78 ? 1 : hash01(i, g) > 0.72 ? 2 : 0;
          plant(
            draft,
            cx + Math.cos(angle) * radius,
            cz + Math.sin(angle) * radius,
            kind === 2 ? 0.55 : 1.05 + hash01(cx, i) * 0.9,
            kind,
          );
        }
      }
    });
  for (let x = -92; x <= 100; x += 12.5) {
    const kind = hash01(x, 3) > 0.62 ? 1 : hash01(x, 5) > 0.7 ? 2 : 0;
    if (hash01(x, -8) > 0.35) {
      plant(draft, x + (hash01(x, -8) - 0.5) * 2, -74.2, 1.5 + hash01(x, -50) * 0.9, kind);
    }
    if (hash01(x, 50) > 0.4) {
      plant(draft, x + 2.2, 70.4, 1.4 + hash01(x, 50) * 0.85, kind === 0 ? 1 : 0);
    }
  }
  for (let z = -70; z <= 66; z += 14) {
    plant(draft, -92.5, z + (hash01(z, 1) - 0.5) * 2, 1.45 + hash01(-60, z) * 0.7, 1);
    if (hash01(70, z) > 0.4) plant(draft, 101.5, z, 1.35 + hash01(70, z) * 0.75, 0);
  }
  thinTrees(draft, 0.5);
}

function pushLamp(draft: Draft, x: number, z: number, yaw: number, solar = false) {
  if (blocked(x, z, 0.25)) return;
  if (draft.lamps.some((lamp) => (lamp.x - x) ** 2 + (lamp.z - z) ** 2 < 36)) return;
  draft.lamps.push({ x, z, yaw, solar });
}

function scatterLamps(draft: Draft) {
  roads.forEach((road) => {
    const wide = Math.min(road.w, road.d) >= 7;
    const step = wide ? 14 : 18;
    const horizontal = road.w >= road.d;
    if (horizontal) {
      for (let x = road.x - road.w / 2 + 6; x < road.x + road.w / 2 - 4; x += step) {
        if (nearJunction(x, road.z, 2.6)) continue;
        const solar = hash01(x, road.z) > 0.55;
        pushLamp(draft, x, road.z + road.d / 2 + 0.25, Math.PI / 2, solar);
        if (hash01(x + 1, -road.z) > 0.35) {
          pushLamp(draft, x + step * 0.45, road.z - road.d / 2 - 0.25, -Math.PI / 2, !solar);
        }
      }
    } else {
      for (let z = road.z - road.d / 2 + 6; z < road.z + road.d / 2 - 4; z += step) {
        if (nearJunction(road.x, z, 2.6)) continue;
        const solar = hash01(road.x, z) > 0.5;
        pushLamp(draft, road.x + road.w / 2 + 0.25, z, Math.PI, solar);
        if (hash01(-road.x, z + 2) > 0.38) {
          pushLamp(draft, road.x - road.w / 2 - 0.25, z + step * 0.4, 0, !solar);
        }
      }
    }
  });
  intersections().forEach((cross, index) => {
    const solar = index % 2 === 0;
    pushLamp(draft, cross.x + cross.w / 2 + 0.55, cross.z + cross.d / 2 + 0.55, Math.PI * 0.75, solar);
    pushLamp(draft, cross.x - cross.w / 2 - 0.55, cross.z - cross.d / 2 - 0.55, -Math.PI * 0.25, !solar);
  });
  for (let z = -70; z <= 66; z += 12) {
    const x = canalX(z);
    pushLamp(draft, x - CANAL_HALF - 2.4, z, Math.PI / 2, hash01(z, 3) > 0.45);
    pushLamp(draft, x + CANAL_HALF + 2.5, z + 4, -Math.PI / 2, hash01(z, 7) > 0.4);
  }
  draft.lamps.push({ x: BRIDGE.x - BRIDGE.w / 2 + 1.8, z: BRIDGE.z + 2.2, yaw: Math.PI / 2, solar: true });
  draft.lamps.push({ x: BRIDGE.x + BRIDGE.w / 2 - 1.8, z: BRIDGE.z - 2.2, yaw: -Math.PI / 2, solar: true });
}

function scatterFurniture(draft: Draft) {
  const stops: Array<{ x: number; z: number; yaw: number }> = [
    { x: -44, z: 8.4, yaw: 0 },
    { x: -14, z: -8.2, yaw: Math.PI },
    { x: 8.5, z: 10.2, yaw: 0 },
    { x: -78, z: 6.5, yaw: 0 },
    { x: 64, z: -10.5, yaw: Math.PI },
    { x: 88, z: 8.8, yaw: 0 },
  ];
  stops.forEach((stop) => {
    const side = Math.cos(stop.yaw) >= 0 ? 1 : -1;
    const x = stop.x + side * 4.1;
    const z = stop.z;
    if (blocked(x, z, 1.2) || draft.footprints.some((spot) => rectContains(spot, x, z, 1))) return;
    draft.props.push({
      asset: "busShelter",
      x,
      z,
      yaw: stop.yaw + Math.PI / 2,
      targetW: 4.6,
      targetD: 2.2,
      fit: 0.95,
    });
    draft.footprints.push({ x, z, w: 5.2, d: 2.8 });
  });

  const transformers: Array<{ x: number; z: number; yaw: number }> = [
    { x: -50.5, z: 18.5, yaw: 0 },
    { x: 4.2, z: -28.5, yaw: Math.PI / 2 },
    { x: 70.5, z: 18.2, yaw: 0 },
    { x: -84.2, z: -8.5, yaw: Math.PI / 2 },
    { x: 96.5, z: -22.4, yaw: 0 },
    { x: -30.2, z: 54.5, yaw: Math.PI / 2 },
  ];
  transformers.forEach((pad) => {
    if (blocked(pad.x, pad.z, 1.4) || draft.footprints.some((spot) => rectContains(spot, pad.x, pad.z, 1.2))) return;
    draft.props.push({
      asset: "cityTransformer",
      x: pad.x,
      z: pad.z,
      yaw: pad.yaw,
      targetW: 3.6,
      targetD: 2.4,
      fit: 0.92,
    });
    draft.footprints.push({ x: pad.x, z: pad.z, w: 4.2, d: 3.2 });
  });
}

function buildCars(draft: Draft, group: THREE.Group) {
  if (draft.cars.length === 0) return;
  const layers = createVehicleLayers("car");
  const body = new THREE.InstancedMesh(layers.body, draft.mats.car, draft.cars.length);
  const glass = new THREE.InstancedMesh(layers.glass, draft.mats.glass, draft.cars.length);
  const wheels = new THREE.InstancedMesh(layers.wheels, draft.mats.tire, draft.cars.length);
  const trim = new THREE.InstancedMesh(layers.trim, draft.mats.metalDark, draft.cars.length);
  const dummy = new THREE.Object3D();
  draft.cars.forEach((car, index) => {
    dummy.position.set(car.x, car.y, car.z);
    dummy.rotation.set(0, car.yaw, 0);
    dummy.updateMatrix();
    body.setMatrixAt(index, dummy.matrix);
    glass.setMatrixAt(index, dummy.matrix);
    wheels.setMatrixAt(index, dummy.matrix);
    trim.setMatrixAt(index, dummy.matrix);
    body.setColorAt(index, new THREE.Color(PAINTS[car.color] ?? PAINTS[0]));
  });
  [body, wheels, trim, glass].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = draft.quality === "high" && mesh === body;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  if (body.instanceColor) body.instanceColor.needsUpdate = true;
}

function buildLamps(draft: Draft, group: THREE.Group, quality: "high" | "low") {
  if (draft.lamps.length === 0) return null;
  const poolGeo = new THREE.CircleGeometry(5.4, 24);
  poolGeo.rotateX(-Math.PI / 2);
  const poolsMat = new THREE.MeshBasicMaterial({
    color: "#ffb15a",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const pools = new THREE.InstancedMesh(poolGeo, poolsMat, draft.lamps.length);
  const dummy = new THREE.Object3D();
  const useProceduralPoles = quality === "low";
  let poles: THREE.InstancedMesh | null = null;
  let heads: THREE.InstancedMesh | null = null;
  if (useProceduralPoles) {
    const pole = new THREE.CylinderGeometry(0.05, 0.09, 4.15, 7);
    pole.translate(0, 2.12, 0);
    const base = new THREE.CylinderGeometry(0.16, 0.2, 0.12, 8);
    base.translate(0, 0.06, 0);
    const arm = new THREE.BoxGeometry(0.78, 0.05, 0.08);
    arm.translate(0.32, 4.18, 0);
    const brace = new THREE.BoxGeometry(0.06, 0.42, 0.05);
    brace.translate(0.48, 3.92, 0);
    const poleGeo = mergeGeometries([pole, base, arm, brace], false);
    pole.dispose();
    base.dispose();
    arm.dispose();
    brace.dispose();
    const head = new THREE.BoxGeometry(0.52, 0.1, 0.24);
    head.translate(0.52, 4.08, 0);
    if (poleGeo) {
      poles = new THREE.InstancedMesh(poleGeo, draft.mats.lampPole, draft.lamps.length);
      heads = new THREE.InstancedMesh(head, draft.mats.lampHead, draft.lamps.length);
      poles.castShadow = true;
      poles.receiveShadow = true;
    }
  }
  draft.lamps.forEach((lamp, index) => {
    if (poles && heads) {
      dummy.position.set(lamp.x, 0, lamp.z);
      dummy.rotation.set(0, lamp.yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(index, dummy.matrix);
      heads.setMatrixAt(index, dummy.matrix);
    }
    dummy.position.set(lamp.x, 0.15, lamp.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    pools.setMatrixAt(index, dummy.matrix);
  });
  if (poles && heads) {
    poles.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    group.add(poles, heads);
  }
  pools.instanceMatrix.needsUpdate = true;
  pools.receiveShadow = false;
  pools.renderOrder = 2;
  group.add(pools);
  return poolsMat;
}

function mergeParts(parts: THREE.BufferGeometry[], label: string) {
  const normalized = parts.map((part) => {
    if (!part.index) return part;
    const flat = part.toNonIndexed();
    part.dispose();
    return flat;
  });
  const merged = mergeGeometries(normalized, false);
  normalized.forEach((part) => part.dispose());
  if (!merged) throw new Error(`Could not build ${label}`);
  merged.computeVertexNormals();
  return merged;
}

function foliageLobes(detail: number, lobes: Array<[number, number, number, number, number, number]>) {
  return lobes.map(([x, y, z, sx, sy, sz]) => {
    const lobe = new THREE.IcosahedronGeometry(1, detail);
    lobe.scale(sx, sy, sz);
    lobe.translate(x, y, z);
    return lobe;
  });
}

function organic(geo: THREE.BufferGeometry, seed: number, amount: number) {
  const position = geo.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const wave = Math.sin(x * 3.2 + seed * 1.7) * Math.cos(z * 2.8 + y * 1.6 + seed);
    const bulge = 1 + wave * amount;
    position.setXYZ(i, x * bulge, y * (0.94 + wave * amount * 0.3), z * bulge);
  }
  position.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function deciduousCrown(detail: number, seed = 1) {
  const spreading = seed % 2 === 1;
  const parts: THREE.BufferGeometry[] = foliageLobes(
    detail,
    spreading
      ? [
          [0, 0.2, 0, 1.45, 0.62, 1.25],
          [1.15, -0.08, 0.35, 0.82, 0.48, 0.72],
          [-1.05, -0.14, 0.2, 0.76, 0.46, 0.66],
          [0.15, 0.05, -1.12, 0.8, 0.5, 0.7],
          [0.25, 0.82, 0.05, 0.55, 0.42, 0.5],
          [-0.62, 0.48, -0.35, 0.48, 0.34, 0.44],
          [0.7, 0.28, -0.5, 0.4, 0.3, 0.38],
        ]
      : [
          [0, 0.35, 0, 0.72, 1.15, 0.68],
          [0.38, 0.15, 0.2, 0.48, 0.72, 0.46],
          [-0.34, 0.55, -0.1, 0.42, 0.64, 0.4],
          [0.08, 1.05, 0.05, 0.36, 0.48, 0.34],
          [-0.12, -0.15, 0.28, 0.5, 0.4, 0.42],
        ],
  );
  [
    [0.85, -0.35, 0.25],
    [-0.75, -0.4, 0.1],
    [0.1, -0.3, -0.8],
  ].forEach(([x, y, z]) => {
    const limb = new THREE.CylinderGeometry(0.05, 0.09, 0.9, 5).toNonIndexed();
    limb.translate(0, 0.2, 0);
    limb.rotateZ(Math.atan2(x, 0.8));
    limb.rotateY(Math.atan2(x, z || 0.01));
    limb.translate(x * 0.45, y, z * 0.45);
    parts.push(limb);
  });
  return organic(mergeParts(parts, "a broadleaf crown"), seed, spreading ? 0.16 : 0.12);
}

function coniferCrown() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i += 1) {
    const cone = new THREE.ConeGeometry(1.15 - i * 0.16, 0.95, 10);
    cone.translate((i % 2 === 0 ? 0.06 : -0.05) * (1 - i * 0.08), 0.05 + i * 0.52, i % 3 === 0 ? -0.04 : 0.03);
    parts.push(cone);
  }
  return organic(mergeParts(parts, "a conifer crown"), 4, 0.08);
}

function shrubCrown(detail: number) {
  return organic(
    mergeParts(
      foliageLobes(detail, [
        [0, 0.05, 0, 1.15, 0.48, 1.05],
        [0.55, -0.05, 0.2, 0.55, 0.32, 0.5],
        [-0.45, 0.02, -0.25, 0.5, 0.3, 0.48],
        [0.1, 0.18, -0.4, 0.42, 0.28, 0.4],
      ]),
      "a shrub",
    ),
    2,
    0.14,
  );
}

function buildTrees(draft: Draft, group: THREE.Group): CanopySway[] {
  if (draft.trees.length === 0) return [];
  const detail = draft.quality === "high" ? 1 : 0;
  const crowns = [deciduousCrown(detail, 1), coniferCrown(), shrubCrown(0), deciduousCrown(detail, 2)];
  const materials = [draft.mats.canopy, draft.mats.canopyPine, draft.mats.canopy, draft.mats.canopy];
  const counts = [0, 0, 0, 0];
  draft.trees.forEach((tree) => {
    counts[tree.kind] += 1;
  });
  const meshes = crowns.map((geo, kind) => {
    if (counts[kind] === 0) {
      geo.dispose();
      return null;
    }
    const mesh = new THREE.InstancedMesh(geo, materials[kind], counts[kind]);
    mesh.count = 0;
    mesh.castShadow = draft.quality === "high" && kind !== 2;
    mesh.receiveShadow = true;
    return mesh;
  });
  const trunkGeo = new THREE.CylinderGeometry(0.13, 0.24, 1, 8);
  trunkGeo.translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, draft.mats.trunk, draft.trees.length);
  const broadleaf = ["#3e6d33", "#4c7b3b", "#2d5228", "#5c8740", "#6a9140", "#345c2e"].map((color) => new THREE.Color(color));
  const pine = ["#1c3b27", "#254832", "#163024", "#2a5136"].map((color) => new THREE.Color(color));
  const shrub = ["#4a7838", "#3d6830", "#5b8642"].map((color) => new THREE.Color(color));
  const columnar = ["#4a7340", "#355e32", "#5d8144", "#2f5530"].map((color) => new THREE.Color(color));
  const palettes = [broadleaf, pine, shrub, columnar];
  const trunkColors = ["#6a5140", "#5a4538", "#75604c", "#4c3d32"].map((color) => new THREE.Color(color));
  const records: Array<CanopySway | null> = meshes.map((mesh) =>
    mesh
      ? {
          mesh,
          index: [],
          x: [],
          y: [],
          z: [],
          sx: [],
          sy: [],
          sz: [],
          yaw: [],
        }
      : null,
  );
  const slot = [0, 0, 0, 0];
  const dummy = new THREE.Object3D();
  draft.trees.forEach((tree, index) => {
    const kind = tree.kind;
    const yaw = hash01(tree.x, tree.z) * Math.PI * 2;
    const broad = kind === 0 || kind === 3;
    const trunkH = kind === 2 ? 0.32 + tree.s * 0.15 : kind === 3 ? 2.1 + tree.s * 1.7 : broad ? 1.7 + tree.s * 1.35 : 2.2 + tree.s * 1.55;
    const trunkR = kind === 2 ? 0.35 : kind === 3 ? 0.42 : broad ? 0.55 : 0.42;
    dummy.position.set(tree.x, 0, tree.z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(trunkR, trunkH, trunkR);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);
    trunks.setColorAt(index, trunkColors[index % trunkColors.length]);
    const crownY = kind === 2 ? trunkH * 0.7 : kind === 3 ? trunkH * 0.62 : broad ? trunkH * 0.58 : trunkH * 0.46;
    const sx = tree.s * (kind === 3 ? 0.92 : broad ? 1.5 : kind === 1 ? 0.88 : 1.22);
    const sy = tree.s * (kind === 3 ? 1.28 : broad ? 0.98 : kind === 1 ? 1.5 : 0.62);
    const sz = tree.s * (kind === 3 ? 0.88 : broad ? 1.35 : kind === 1 ? 0.88 : 1.12);
    dummy.position.set(tree.x, crownY, tree.z);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    const i = slot[kind];
    slot[kind] += 1;
    const mesh = meshes[kind];
    const part = records[kind];
    if (!mesh || !part) return;
    mesh.setMatrixAt(i, dummy.matrix);
    const palette = palettes[kind];
    mesh.setColorAt(i, palette[index % palette.length]);
    part.index.push(i);
    part.x.push(tree.x);
    part.y.push(crownY);
    part.z.push(tree.z);
    part.sx.push(sx);
    part.sy.push(sy);
    part.sz.push(sz);
    part.yaw.push(yaw);
  });
  meshes.forEach((mesh, kind) => {
    if (!mesh) return;
    mesh.count = slot[kind];
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  });
  trunks.count = draft.trees.length;
  trunks.instanceMatrix.needsUpdate = true;
  if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true;
  trunks.castShadow = draft.quality === "high";
  trunks.receiveShadow = true;
  group.add(trunks);
  return records.filter((part): part is CanopySway => part !== null && part.index.length > 0);
}

function valueNoise(x: number, z: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const cell = (cx: number, cz: number) => {
    const n = Math.sin(cx * 127.1 + cz * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const a = cell(ix, iz);
  const b = cell(ix + 1, iz);
  const c = cell(ix, iz + 1);
  const d = cell(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function terrainNoise(x: number, z: number) {
  return valueNoise(x * 0.035, z * 0.035) * 0.7 + valueNoise(x * 0.11, z * 0.09) * 0.3;
}

function addTerrain(group: THREE.Group, material: THREE.Material) {
  const geo = new THREE.PlaneGeometry(220, 172, 56, 42);
  geo.rotateX(-Math.PI / 2);
  const position = geo.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const n = terrainNoise(x + 4, z - 2);
    const shade = 0.9 + n * 0.08 + terrainNoise(x * 2.4, z * 2.1) * 0.04;
    colors[i * 3] = shade * 0.92;
    colors[i * 3 + 1] = shade;
    colors[i * 3 + 2] = shade * 0.84;
    position.setY(i, -0.04 + (n - 0.5) * 0.035);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = "terrain";
  mesh.receiveShadow = true;
  mesh.position.set(4, 0, -2);
  group.add(mesh);
}

export function buildCity(quality: "high" | "low"): CityBuild {
  const mats = createCityMaterials();
  mats.marking.polygonOffset = true;
  mats.marking.polygonOffsetFactor = -2;
  mats.marking.polygonOffsetUnits = -4;
  const draft: Draft = {
    bucket: new Bucket(),
    mats,
    trees: [],
    cars: [],
    lamps: [],
    footprints: [],
    props: [],
    quality,
    cottage: null,
    gptBuilding: null,
    skyscraper: null,
  };
  addRoads(draft);
  blocks.forEach((block, index) => {
    if (block.kind === "tower") addTower(draft, block);
    else if (block.kind === "townhouses") addHomes(draft, block, "town");
    else if (block.kind === "villas") addHomes(draft, block, "villa");
    else if (block.kind === "office") addOffice(draft, block);
    else if (block.kind === "civic") addCivic(draft, block);
    else if (block.kind === "park") addPark(draft, block);
    else if (block.kind === "parking") addParking(draft, block);
    else if (block.kind === "warehouse") addWarehouse(draft, block, index);
    else if (block.kind === "tanks") addTanks(draft, block);
    else {
      const asset = ASSET_FOR_KIND[block.kind];
      if (asset) addAssetBuilding(draft, block, asset);
    }
  });
  addCanal(draft);
  scatterTrees(draft);
  scatterLamps(draft);
  scatterFurniture(draft);

  const object = new THREE.Group();
  object.name = "solarflow-city";
  addTerrain(object, mats.terrain);
  draft.bucket.flush(object);
  // High quality uses Streetscape GLB trees; low quality keeps the procedural crowns.
  const canopies = quality === "low" ? buildTrees(draft, object) : [];
  buildCars(draft, object);
  const pools = buildLamps(draft, object, quality);

  const budget = quality === "high" ? 6 : 2;
  const stride = Math.max(1, Math.ceil(draft.lamps.length / Math.max(1, budget)));
  const lights: THREE.SpotLight[] = [];
  for (let i = 0; i < draft.lamps.length && lights.length < budget; i += stride) {
    const lamp = draft.lamps[i];
    const armX = Math.cos(lamp.yaw);
    const armZ = -Math.sin(lamp.yaw);
    const spot = new THREE.SpotLight("#ffb56a", 0, 18, 0.62, 0.55, 1.35);
    spot.position.set(lamp.x + armX * 0.62, 4.35, lamp.z + armZ * 0.62);
    const target = new THREE.Object3D();
    target.position.set(lamp.x + armX * 3.4, 0, lamp.z + armZ * 3.4);
    spot.target = target;
    spot.castShadow = false;
    object.add(spot, target);
    lights.push(spot);
  }

  return {
    object,
    glow: mats.glow,
    lampMaterials: [mats.lampHead],
    lights,
    canopies,
    pools,
    cottage: draft.cottage,
    gptBuilding: draft.gptBuilding,
    skyscraper: draft.skyscraper,
    props: draft.props,
    trees: draft.trees,
    lamps: draft.lamps,
    dispose() {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
      mats.dispose();
      pools?.dispose();
    },
  };
}
