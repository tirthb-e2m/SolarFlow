import { CANAL_HALF, canalX } from "@/scene/city/canal";
import { BRIDGE, FOOTBRIDGE, blocks, intersections, roads, type Block } from "@/scene/city/layout";
import type { InstallationSite } from "@/scene/installations/types";

const WALK = 1.46;
const PLINTH = 0.22;
const FLOOR_H = 3.05;
/** Flat-roof membrane + parapet clearance from `flatRoof`. */
const ROOF_CLEAR = 0.76 + 0.22;
/** Keep PV inset from parapet / HVAC. */
const ROOF_INSET = 1.15;

function hash01(x: number, z: number) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Deterministic keep rate (~75%) so hover/activate always select the same subset. */
export function pickFraction<T extends { x: number; z: number }>(items: T[], keep = 0.75, salt = 1): T[] {
  const scored = items
    .map((item, index) => ({
      item,
      score: hash01(item.x * salt + index * 0.17, item.z * salt + 2.3),
    }))
    .sort((a, b) => a.score - b.score);
  const count = Math.max(1, Math.round(items.length * keep));
  return scored.slice(0, count).map((entry) => entry.item);
}

function homeLots(block: Block, style: "town" | "villa"): InstallationSite[] {
  const unitW = style === "town" ? 5.55 : 6.65;
  const unitD = 7.25;
  const minGap = style === "town" ? 0.42 : 2.15;
  const front = style === "town" ? 2.25 : 2.5;
  const innerW = block.w - WALK * 2;
  const innerD = block.d - WALK * 2;
  const count = Math.floor((innerW + minGap) / (unitW + minGap));
  if (count < 1 || innerW < unitW) return [];
  const rowW = count * unitW + (count - 1) * minGap;
  const alley = innerD - front * 2 - unitD * 2;
  const sides = alley >= 2.1 ? (["south", "north"] as const) : (["south"] as const);
  const sites: InstallationSite[] = [];
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
      if (roof !== "flat") continue;
      // Cottage / gpt review lots keep their own roofs; skip those two villa slots.
      if (style === "villa" && side === "south" && i === 1) continue;
      if (style === "villa" && side === "north" && i === 1) continue;
      const fw = unitW - 0.1 - (!solar && hash01(x, z) > 0.64 ? 0.42 : 0);
      const fd = solar ? unitD : unitD - (hash01(z, x) > 0.6 ? 0.38 : 0);
      sites.push({
        x,
        y: PLINTH + floors * FLOOR_H + ROOF_CLEAR,
        z,
        yaw,
        w: Math.max(1.6, fw - ROOF_INSET),
        d: Math.max(1.6, fd - ROOF_INSET),
      });
      void row;
    }
  });
  return sites;
}

function officeRoofs(block: Block): InstallationSite[] {
  const fw = 9.6;
  const fd = 12.2;
  const floors = 7;
  const floorH = 3.2;
  const wallH = floors * floorH;
  const z = block.z - 1.6;
  const roofY = wallH + 0.12 + ROOF_CLEAR;
  const wingH = 3 * floorH;
  const wingZ = z + fd / 2 + 4.4;
  return [
    {
      x: block.x,
      y: roofY,
      z,
      yaw: 0,
      w: Math.max(2, fw - ROOF_INSET * 1.2),
      d: Math.max(2, fd - ROOF_INSET * 1.2),
    },
    {
      x: block.x,
      y: 0.12 + wingH + ROOF_CLEAR,
      z: wingZ,
      yaw: 0,
      w: Math.max(2, fw - 1.4 - ROOF_INSET),
      d: Math.max(1.6, 6.4 - ROOF_INSET),
    },
  ];
}

function assetRoof(block: Block): InstallationSite | null {
  const margin = block.kind === "landmark" || block.kind === "tower" ? 2.4 : 3.2;
  const fw = Math.max(8, Math.min(block.w - margin, block.kind === "school" ? 28 : block.kind === "landmark" || block.kind === "tower" ? 14 : 22));
  const fd = Math.max(8, Math.min(block.d - margin, block.kind === "landmark" || block.kind === "tower" ? 16 : 18));
  const yaw = hash01(block.x, block.z) > 0.55 ? Math.PI / 2 : 0;
  const placedW = yaw === 0 ? fw : fd;
  const placedD = yaw === 0 ? fd : fw;
  const heights: Record<string, number> = {
    officeMidrise: 15.2,
    apartment: 19.5,
    commercial: 11.2,
    school: 13.4,
    hospital: 15.8,
    library: 8.6,
    landmark: 38,
    tower: 38,
  };
  const y = heights[block.kind];
  if (y == null) return null;
  return {
    x: block.x,
    y: y + 0.35,
    z: block.z,
    yaw,
    w: Math.max(2.4, placedW - ROOF_INSET * 1.4),
    d: Math.max(2.4, placedD - ROOF_INSET * 1.4),
  };
}

/** Every flat roof that can host PV across the expanded city. */
export function eligibleRooftops(): InstallationSite[] {
  const sites: InstallationSite[] = [];
  blocks.forEach((block) => {
    if (block.kind === "townhouses") sites.push(...homeLots(block, "town"));
    else if (block.kind === "villas") sites.push(...homeLots(block, "villa"));
    else if (block.kind === "office") sites.push(...officeRoofs(block));
    else if (
      block.kind === "officeMidrise" ||
      block.kind === "apartment" ||
      block.kind === "commercial" ||
      block.kind === "school" ||
      block.kind === "hospital" ||
      block.kind === "library" ||
      block.kind === "landmark" ||
      block.kind === "tower"
    ) {
      const roof = assetRoof(block);
      if (roof) sites.push(roof);
    }
  });
  return sites;
}

export function selectedRooftops() {
  return pickFraction(eligibleRooftops(), 0.75, 1.7);
}

function nearJunction(x: number, z: number, pad: number) {
  return intersections().some(
    (cross) => Math.abs(x - cross.x) <= cross.w / 2 + pad && Math.abs(z - cross.z) <= cross.d / 2 + pad,
  );
}

/** Mirrors `scatterLamps` placement so street upgrades track the Phase 1 city. */
export function eligibleStreetlights(): InstallationSite[] {
  const sites: InstallationSite[] = [];
  const seen = new Set<string>();
  const push = (x: number, z: number, yaw: number) => {
    const key = `${x.toFixed(1)}:${z.toFixed(1)}`;
    if (seen.has(key)) return;
    if (sites.some((lamp) => (lamp.x - x) ** 2 + (lamp.z - z) ** 2 < 36)) return;
    seen.add(key);
    sites.push({ x, y: 4.35, z, yaw, w: 0.72, d: 0.42 });
  };

  roads.forEach((road) => {
    const wide = Math.min(road.w, road.d) >= 7;
    const step = wide ? 14 : 18;
    const horizontal = road.w >= road.d;
    if (horizontal) {
      for (let x = road.x - road.w / 2 + 6; x < road.x + road.w / 2 - 4; x += step) {
        if (nearJunction(x, road.z, 2.6)) continue;
        push(x, road.z + road.d / 2 + 0.25, Math.PI / 2);
        if (hash01(x + 1, -road.z) > 0.35) {
          push(x + step * 0.45, road.z - road.d / 2 - 0.25, -Math.PI / 2);
        }
      }
    } else {
      for (let z = road.z - road.d / 2 + 6; z < road.z + road.d / 2 - 4; z += step) {
        if (nearJunction(road.x, z, 2.6)) continue;
        push(road.x + road.w / 2 + 0.25, z, Math.PI);
        if (hash01(-road.x, z + 2) > 0.38) {
          push(road.x - road.w / 2 - 0.25, z + step * 0.4, 0);
        }
      }
    }
  });

  intersections().forEach((cross) => {
    push(cross.x + cross.w / 2 + 0.55, cross.z + cross.d / 2 + 0.55, Math.PI * 0.75);
    push(cross.x - cross.w / 2 - 0.55, cross.z - cross.d / 2 - 0.55, -Math.PI * 0.25);
  });

  for (let z = -70; z <= 66; z += 12) {
    const x = canalX(z);
    push(x - CANAL_HALF - 2.4, z, Math.PI / 2);
    push(x + CANAL_HALF + 2.5, z + 4, -Math.PI / 2);
  }

  push(BRIDGE.x - BRIDGE.w / 2 + 1.8, BRIDGE.z + 2.2, Math.PI / 2);
  push(BRIDGE.x + BRIDGE.w / 2 - 1.8, BRIDGE.z - 2.2, -Math.PI / 2);
  return sites;
}

export function selectedStreetlights() {
  return pickFraction(eligibleStreetlights(), 0.75, 2.4);
}

function clearOfDeck(z: number) {
  return Math.abs(z - BRIDGE.z) > BRIDGE.d / 2 + 3.2 && Math.abs(z - FOOTBRIDGE.z) > FOOTBRIDGE.d / 2 + 2.4;
}

/**
 * Modular floating PV patches along the canal. Kept inside the water with
 * visible channels between sections and open river edges.
 */
export function floatingModules(): InstallationSite[] {
  const sites: InstallationSite[] = [];
  const moduleAlong = 5.2;
  const moduleAcross = 3.6;
  const gapAlong = 1.9;
  const laneGap = 1.05;
  const z0 = -44;
  const z1 = 44;
  for (let z = z0; z <= z1; z += moduleAlong + gapAlong) {
    if (!clearOfDeck(z) || !clearOfDeck(z + moduleAlong * 0.45)) continue;
    const cx = canalX(z);
    const dx = canalX(z + 0.4) - canalX(z - 0.4);
    const yaw = Math.atan2(dx, 0.8);
    // Twin lanes with a center water channel and free river edges.
    for (const side of [-1, 1] as const) {
      const offset = side * (moduleAcross / 2 + laneGap / 2);
      if (Math.abs(offset) + moduleAcross / 2 > CANAL_HALF - 1.05) continue;
      const nx = -Math.sin(yaw);
      const nz = Math.cos(yaw);
      const x = cx + nx * offset;
      const zz = z + nz * offset * 0.05;
      if (!clearOfDeck(zz)) continue;
      if (Math.abs(x - canalX(zz)) + moduleAcross / 2 > CANAL_HALF - 0.9) continue;
      sites.push({
        x,
        y: 0.12,
        z: zz,
        yaw,
        w: moduleAcross,
        d: moduleAlong,
      });
    }
  }
  return sites;
}

export function rooftopFocusSite() {
  const villas = blocks.find((block) => block.kind === "villas");
  const selected = selectedRooftops();
  if (!villas) return selected[0];
  const near = selected
    .filter((site) => Math.abs(site.x - villas.x) < villas.w && Math.abs(site.z - villas.z) < villas.d)
    .sort((a, b) => a.z - b.z || a.x - b.x);
  return near[0] ?? selected[0];
}
