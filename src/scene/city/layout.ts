import { CANAL_HALF, canalX, onWater } from "@/scene/city/canal";

export type Rect = {
  x: number;
  z: number;
  w: number;
  d: number;
};

export type BlockKind =
  | "tower"
  | "townhouses"
  | "villas"
  | "office"
  | "civic"
  | "park"
  | "parking"
  | "warehouse"
  | "tanks"
  | "officeMidrise"
  | "apartment"
  | "commercial"
  | "school"
  | "hospital"
  | "library"
  | "landmark";

export type Block = Rect & { kind: BlockKind };

const PAD = 0.9;

const roadA = { x: -44, half: 2.8 };
const roadB = { x: -14, half: 2.9 };
const roadC = { x: 8.5, half: 3.2 };
const roadE = { x: 64, half: 2.8 };
/** West ring — expands the city without moving the original western edge. */
const roadW = { x: -78, half: 2.7 };
/** East ring beyond the industrial corridor. */
const roadF = { x: 88, half: 2.7 };
const northRoad = { z: -38, half: 2.7 };
const boulevard = { z: 0, half: 3.7 };
const southRoad = { z: 34, half: 2.65 };
const outerNorth = { z: -68, half: 2.5 };
const outerSouth = { z: 62, half: 2.5 };

const leftX0 = -63.2;
const leftX1 = roadA.x - roadA.half - PAD;
const midX0 = roadA.x + roadA.half + PAD;
const midX1 = roadB.x - roadB.half - PAD;
const rightX0 = roadB.x + roadB.half + PAD;
const rightX1 = roadC.x - roadC.half - PAD;

const northZ0 = northRoad.z + northRoad.half + PAD;
const northZ1 = boulevard.z - boulevard.half - PAD;
const southZ0 = boulevard.z + boulevard.half + PAD;
const southZ1 = southRoad.z - southRoad.half - PAD;
const farNorthZ0 = -55.2;
const farNorthZ1 = northRoad.z - northRoad.half - PAD;
const farSouthZ0 = southRoad.z + southRoad.half + PAD;
const farSouthZ1 = 49.2;

const westX0 = -94.5;
const westX1 = roadW.x - roadW.half - PAD;
const westInnerX0 = roadW.x + roadW.half + PAD;
const westInnerX1 = leftX0 - PAD;
const eastX0 = roadE.x + roadE.half + PAD;
const eastX1 = roadF.x - roadF.half - PAD;
const farEastX0 = roadF.x + roadF.half + PAD;
const farEastX1 = 104;
const rimNorthZ0 = -76.5;
const rimNorthZ1 = outerNorth.z - outerNorth.half - PAD;
const rimSouthZ0 = outerSouth.z + outerSouth.half + PAD;
const rimSouthZ1 = 72.5;
const midNorthZ0 = outerNorth.z + outerNorth.half + PAD;
const midNorthZ1 = farNorthZ0 - PAD;
const midSouthZ0 = farSouthZ1 + PAD;
const midSouthZ1 = outerSouth.z - outerSouth.half - PAD;

function cell(x0: number, x1: number, z0: number, z1: number, kind: BlockKind): Block {
  return {
    kind,
    x: (x0 + x1) / 2,
    z: (z0 + z1) / 2,
    w: x1 - x0,
    d: z1 - z0,
  };
}

function hRoad(x0: number, x1: number, z: number, width: number): Rect {
  return { x: (x0 + x1) / 2, z, w: Math.abs(x1 - x0), d: width };
}

function vRoad(x: number, z0: number, z1: number, width: number): Rect {
  return { x, z: (z0 + z1) / 2, w: width, d: Math.abs(z1 - z0) };
}

const ROAD_Z0 = -72;
const ROAD_Z1 = 68;
const ROAD_X0 = -96;
const ROAD_X1 = 106;

export const roads: Rect[] = [
  vRoad(roadW.x, ROAD_Z0, ROAD_Z1, roadW.half * 2),
  vRoad(roadA.x, ROAD_Z0, ROAD_Z1, roadA.half * 2),
  vRoad(roadB.x, ROAD_Z0, ROAD_Z1, roadB.half * 2),
  vRoad(roadC.x, ROAD_Z0, ROAD_Z1, roadC.half * 2),
  vRoad(roadE.x, ROAD_Z0, ROAD_Z1, roadE.half * 2),
  vRoad(roadF.x, ROAD_Z0, ROAD_Z1, roadF.half * 2),
  hRoad(ROAD_X0, 11.6, outerNorth.z, outerNorth.half * 2),
  hRoad(40.4, ROAD_X1, outerNorth.z, outerNorth.half * 2),
  hRoad(ROAD_X0, 11.6, northRoad.z, northRoad.half * 2),
  hRoad(40.4, ROAD_X1, northRoad.z, northRoad.half * 2),
  hRoad(ROAD_X0, 11.6, boulevard.z, boulevard.half * 2),
  hRoad(40.4, ROAD_X1, boulevard.z, boulevard.half * 2),
  hRoad(ROAD_X0, 11.6, southRoad.z, southRoad.half * 2),
  hRoad(40.4, ROAD_X1, southRoad.z, southRoad.half * 2),
  hRoad(ROAD_X0, 11.6, outerSouth.z, outerSouth.half * 2),
  hRoad(40.4, ROAD_X1, outerSouth.z, outerSouth.half * 2),
];

/** Road deck that spans the canal. Asphalt is built with the bridge, not the road list. */
export const BRIDGE: Rect = { x: 26, z: 0, w: 28.8, d: 7.4 };

/** Narrow crossing in the northern residential band. */
export const FOOTBRIDGE: Rect = { x: 25.6, z: -20, w: 27.7, d: 3.3 };

/**
 * Original core blocks keep their exact footprints. New districts ring the city
 * so the explorable area grows by roughly half without relocating existing massing.
 */
export const blocks: Block[] = [
  // --- Original core (unchanged centers and sizes) ---
  cell(leftX0, leftX1, northZ0, northZ1, "tower"),
  cell(midX0, midX1, northZ0, northZ1, "townhouses"),
  cell(rightX0, rightX1, northZ0, northZ1, "office"),
  cell(leftX0, leftX1, southZ0, southZ1, "townhouses"),
  cell(midX0, midX1, southZ0, southZ1, "villas"),
  cell(rightX0, rightX1, southZ0, southZ1, "civic"),
  cell(leftX0, leftX1, farNorthZ0, farNorthZ1, "park"),
  cell(midX0, midX1, farNorthZ0, farNorthZ1, "park"),
  cell(rightX0, rightX1, farNorthZ0, farNorthZ1, "park"),
  cell(leftX0, leftX1, farSouthZ0, farSouthZ1, "park"),
  cell(midX0, midX1, farSouthZ0, farSouthZ1, "parking"),
  cell(rightX0, rightX1, farSouthZ0, farSouthZ1, "park"),
  cell(40.6, 60.4, northZ0, northZ1, "warehouse"),
  cell(40.6, 60.4, southZ0, southZ1, "warehouse"),
  cell(42, 60.2, -54.6, -42.3, "tanks"),
  cell(42, 60.2, farSouthZ0, farSouthZ1, "parking"),

  // --- West district ---
  cell(westX0, westX1, northZ0, northZ1, "apartment"),
  cell(westX0, westX1, southZ0, southZ1, "officeMidrise"),
  cell(westX0, westX1, farNorthZ0, farNorthZ1, "park"),
  cell(westX0, westX1, farSouthZ0, farSouthZ1, "commercial"),
  cell(westInnerX0, westInnerX1, northZ0, northZ1, "officeMidrise"),
  cell(westInnerX0, westInnerX1, southZ0, southZ1, "apartment"),
  cell(westInnerX0, westInnerX1, farNorthZ0, farNorthZ1, "library"),
  cell(westInnerX0, westInnerX1, farSouthZ0, farSouthZ1, "park"),

  // --- East district ---
  cell(eastX0, eastX1, northZ0, northZ1, "hospital"),
  cell(eastX0, eastX1, southZ0, southZ1, "school"),
  cell(eastX0, eastX1, farSouthZ0, farSouthZ1, "apartment"),
  cell(farEastX0, farEastX1, northZ0, northZ1, "commercial"),
  cell(farEastX0, farEastX1, southZ0, southZ1, "officeMidrise"),
  cell(farEastX0, farEastX1, farSouthZ0, farSouthZ1, "parking"),
  cell(farEastX0, farEastX1, farNorthZ0, farNorthZ1, "park"),

  // --- North rim ---
  cell(westX0, westX1, midNorthZ0, midNorthZ1, "apartment"),
  cell(leftX0, leftX1, midNorthZ0, midNorthZ1, "landmark"),
  cell(midX0, midX1, midNorthZ0, midNorthZ1, "officeMidrise"),
  cell(rightX0, rightX1, midNorthZ0, midNorthZ1, "commercial"),
  cell(eastX0, eastX1, midNorthZ0, midNorthZ1, "park"),
  cell(westX0, westX1, rimNorthZ0, rimNorthZ1, "park"),
  cell(leftX0, leftX1, rimNorthZ0, rimNorthZ1, "park"),
  cell(midX0, midX1, rimNorthZ0, rimNorthZ1, "park"),
  cell(rightX0, rightX1, rimNorthZ0, rimNorthZ1, "apartment"),

  // --- South rim ---
  cell(westX0, westX1, midSouthZ0, midSouthZ1, "commercial"),
  cell(leftX0, leftX1, midSouthZ0, midSouthZ1, "apartment"),
  cell(midX0, midX1, midSouthZ0, midSouthZ1, "officeMidrise"),
  cell(rightX0, rightX1, midSouthZ0, midSouthZ1, "park"),
  cell(eastX0, eastX1, midSouthZ0, midSouthZ1, "officeMidrise"),
  cell(westX0, westX1, rimSouthZ0, rimSouthZ1, "park"),
  cell(leftX0, leftX1, rimSouthZ0, rimSouthZ1, "parking"),
  cell(midX0, midX1, rimSouthZ0, rimSouthZ1, "park"),
  cell(rightX0, rightX1, rimSouthZ0, rimSouthZ1, "apartment"),
];

export function rectContains(rect: Rect, x: number, z: number, pad = 0) {
  return Math.abs(x - rect.x) <= rect.w / 2 + pad && Math.abs(z - rect.z) <= rect.d / 2 + pad;
}

export function onRoad(x: number, z: number, pad = 0) {
  return roads.some((road) => rectContains(road, x, z, pad));
}

export function blocked(x: number, z: number, pad = 0) {
  return (
    onWater(x, z, pad) ||
    onRoad(x, z, pad) ||
    rectContains(BRIDGE, x, z, pad) ||
    rectContains(FOOTBRIDGE, x, z, pad)
  );
}

function overlap(a: Rect, b: Rect) {
  const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
  const oz = (a.d + b.d) / 2 - Math.abs(a.z - b.z);
  if (ox <= 0.04 || oz <= 0.04) return 0;
  return Math.min(ox, oz);
}

function hitsWater(block: Rect) {
  for (let i = 0; i <= 8; i += 1) {
    const z = block.z - block.d / 2 + (block.d * i) / 8;
    const left = canalX(z) - CANAL_HALF;
    const right = canalX(z) + CANAL_HALF;
    const blockLeft = block.x - block.w / 2;
    const blockRight = block.x + block.w / 2;
    if (blockRight > left && blockLeft < right) return true;
  }
  return false;
}

export function auditLayout() {
  const problems: string[] = [];
  blocks.forEach((block, index) => {
    if (block.w < 4 || block.d < 4) {
      problems.push(`block ${index} ${block.kind} is too small (${block.w.toFixed(1)} x ${block.d.toFixed(1)})`);
    }
    roads.forEach((road, roadIndex) => {
      const amount = overlap(block, road);
      if (amount > 0.08) {
        problems.push(`block ${index} ${block.kind} overlaps road ${roadIndex} by ${amount.toFixed(2)}m`);
      }
    });
    if (hitsWater(block)) problems.push(`block ${index} ${block.kind} intersects the canal`);
    const bridgeHit = overlap(block, BRIDGE);
    if (bridgeHit > 0.08) problems.push(`block ${index} ${block.kind} overlaps the bridge`);
    const footHit = overlap(block, FOOTBRIDGE);
    if (footHit > 0.08) problems.push(`block ${index} ${block.kind} overlaps the footbridge`);
    blocks.forEach((other, otherIndex) => {
      if (otherIndex <= index) return;
      const amount = overlap(block, other);
      if (amount > 0.08) {
        problems.push(`block ${index} ${block.kind} overlaps block ${otherIndex} ${other.kind}`);
      }
    });
  });
  return problems;
}

export function intersections() {
  const hits: Array<Rect & { vertical: Rect; horizontal: Rect }> = [];
  const seen = new Set<string>();
  roads.forEach((a) => {
    roads.forEach((b) => {
      const aWide = a.w >= a.d;
      const bWide = b.w >= b.d;
      if (aWide === bWide) return;
      const horizontal = aWide ? a : b;
      const vertical = aWide ? b : a;
      if (Math.abs(vertical.x - horizontal.x) > horizontal.w / 2) return;
      if (Math.abs(horizontal.z - vertical.z) > vertical.d / 2) return;
      const key = `${vertical.x.toFixed(2)}:${horizontal.z.toFixed(2)}`;
      if (seen.has(key)) return;
      seen.add(key);
      hits.push({
        x: vertical.x,
        z: horizontal.z,
        w: vertical.w,
        d: horizontal.d,
        vertical,
        horizontal,
      });
    });
  });
  return hits;
}
