import * as THREE from "three";
import { CANAL_HALF, canalX } from "@/scene/city/canal";
import { blocks, intersections, roads } from "@/scene/city/layout";
import { fractionAt } from "@/scene/installations/energy/flow";
import type { InstallationSite } from "@/scene/installations/types";

const GROUND = 0.26;

function villas() {
  const block = blocks.find((item) => item.kind === "villas");
  if (!block) throw new Error("The city is missing its villa block");
  return block;
}

function southWarehouse() {
  const block = blocks.find((item) => item.kind === "warehouse" && item.z > 0);
  if (!block) throw new Error("The city is missing its south warehouse");
  return block;
}

/** West face of the south warehouse, matching `addWarehouse`. */
export function warehouseWestWall() {
  const block = southWarehouse();
  const fw = 11.2;
  const originX = block.x - block.w / 2 + 1.2 + 4.3 + fw / 2;
  return { x: originX - fw / 2, z: block.z };
}

function lampsOn(road: { x: number; z: number; w: number; d: number }) {
  const step = Math.min(road.w, road.d) >= 7 ? 16 : 22;
  const z = road.z + road.d / 2 + 0.2;
  const hits = intersections();
  const sites: Array<{ x: number; z: number }> = [];
  for (let x = road.x - road.w / 2 + 7; x < road.x + road.w / 2 - 5; x += step) {
    const near = hits.some(
      (cross) => Math.abs(x - cross.x) <= cross.w / 2 + 3 && Math.abs(z - cross.z) <= cross.d / 2 + 3,
    );
    if (!near) sites.push({ x, z });
  }
  return sites;
}

export function eastBankLamps() {
  const road = roads.find((item) => item.z === 0 && item.w > item.d && item.x > 20);
  if (!road) return [];
  return lampsOn(road);
}

export function rooftopFeed(site: InstallationSite) {
  const block = villas();
  const facadeZ = site.z + 7.25 / 2 + 0.05;
  const membraneY = site.y - 0.73;
  const sidewalkZ = block.z + block.d / 2 - 0.72;
  const dropX = site.x + 1.05;
  const points = [
    new THREE.Vector3(site.x, membraneY + 0.22, site.z + 1.5),
    new THREE.Vector3(dropX, membraneY + 0.22, site.z + 1.5),
    new THREE.Vector3(dropX, site.y - 0.08, facadeZ - 0.18),
    new THREE.Vector3(dropX, 0.82, facadeZ + 0.02),
    new THREE.Vector3(dropX, GROUND, facadeZ + 0.08),
    new THREE.Vector3(dropX, GROUND, sidewalkZ),
    new THREE.Vector3(dropX + 0.7, 0.42, sidewalkZ),
  ];
  return {
    points,
    house: fractionAt(points, 3),
    grid: fractionAt(points, points.length - 1),
    cabinet: points[points.length - 1],
  };
}

export function streetFeed(sites: readonly InstallationSite[]) {
  const ordered = [...sites].sort((a, b) => a.x - b.x);
  const points = ordered.map((site) => new THREE.Vector3(site.x, GROUND, site.z + 0.28));
  return { points };
}

export function floatingNetwork(origin: THREE.Vector3) {
  const bankX = canalX(origin.z) + CANAL_HALF + 1.15;
  const wall = warehouseWestWall();
  const quayX = bankX + 0.55;
  const substation = new THREE.Vector3(quayX + 1.6, 0.4, 8.6);
  const cabinet = new THREE.Vector3(bankX, 0.42, origin.z);
  const feed = [
    new THREE.Vector3(origin.x, 0.08, origin.z),
    new THREE.Vector3(bankX - 0.15, 0.06, origin.z),
    cabinet.clone(),
    new THREE.Vector3(quayX, GROUND, origin.z),
    new THREE.Vector3(quayX, GROUND, substation.z),
    substation.clone(),
  ];
  const toWarehouse = [
    new THREE.Vector3(substation.x, GROUND, substation.z),
    new THREE.Vector3(substation.x, GROUND, wall.z),
    new THREE.Vector3(wall.x - 0.2, GROUND, wall.z),
  ];
  const lamps = eastBankLamps();
  const toStreet = [
    new THREE.Vector3(substation.x, GROUND, substation.z),
    new THREE.Vector3(substation.x, GROUND, 4.15),
    ...lamps.map((lamp) => new THREE.Vector3(lamp.x, GROUND, lamp.z + 0.28)),
  ];
  return {
    feed,
    cabinet,
    substation,
    cabinetAt: fractionAt(feed, 2),
    substationAt: fractionAt(feed, feed.length - 1),
    toWarehouse,
    warehouseAt: fractionAt(toWarehouse, toWarehouse.length - 1),
    wall,
    toStreet,
    lamps,
    lampAt: lamps.map((_, index) => fractionAt(toStreet, index + 2)),
  };
}
