import * as THREE from "three";
import { canalX } from "@/scene/city/canal";
import { blocks, roads } from "@/scene/city/layout";
import {
  floatingModules,
  rooftopFocusSite,
  selectedRooftops,
  selectedStreetlights,
} from "@/scene/installations/solarSites";
import type { InstallationSpec } from "@/scene/installations/types";

function westBoulevard() {
  const road = roads.find((item) => item.z === 0 && item.w > item.d && item.x < 20);
  if (!road) throw new Error("The city is missing the west boulevard");
  return road;
}

function rooftopSpec(): InstallationSpec {
  const block = blocks.find((item) => item.kind === "villas");
  if (!block) throw new Error("The city is missing its villa block");
  const sites = selectedRooftops();
  const focus = rooftopFocusSite() ?? sites[0];
  const xs = sites.map((site) => site.x);
  const zs = sites.map((site) => site.z);
  const minX = Math.min(...xs, block.x);
  const maxX = Math.max(...xs, block.x);
  const minZ = Math.min(...zs, block.z);
  const maxZ = Math.max(...zs, block.z);
  return {
    id: "rooftop",
    color: "#e36b24",
    marker: {
      x: focus.x,
      y: focus.y + 5.5,
      z: focus.z,
    },
    tip: { x: focus.x, y: focus.y, z: focus.z },
    area: {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
      w: Math.max(block.w + 2.2, maxX - minX + 12),
      d: Math.max(block.d + 1.6, maxZ - minZ + 12),
      y: 11.4,
    },
    sites,
  };
}

function streetSpec(): InstallationSpec {
  const road = westBoulevard();
  const lamps = selectedStreetlights();
  const xs = lamps.map((lamp) => lamp.x);
  const zs = lamps.map((lamp) => lamp.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const mid = (minX + maxX) / 2;
  const boulevardLamps = lamps.filter((lamp) => Math.abs(lamp.z - road.z) < road.d / 2 + 1.2);
  const tip = boulevardLamps.sort((a, b) => Math.abs(a.x - mid) - Math.abs(b.x - mid))[0] ?? lamps[0];
  return {
    id: "streetlight",
    color: "#e7a322",
    marker: { x: tip.x, y: 9.5, z: tip.z + (tip.z >= road.z ? 3.2 : -3.2) },
    tip: { x: tip.x, y: 4.35, z: tip.z },
    area: {
      x: mid,
      z: (Math.min(...zs) + Math.max(...zs)) / 2,
      w: Math.max(10, maxX - minX + 8),
      d: Math.max(road.d + 1.4, Math.max(...zs) - Math.min(...zs) + 6),
      y: 0.22,
    },
    sites: lamps,
  };
}

function floatingSpec(): InstallationSpec {
  const sites = floatingModules();
  const z = 18;
  const x = canalX(z);
  const xs = sites.map((site) => site.x);
  const zs = sites.map((site) => site.z);
  return {
    id: "floating",
    color: "#1aa8b5",
    marker: { x, y: 8.5, z },
    tip: { x, y: 0.2, z },
    area: {
      x: sites.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : x,
      z: sites.length ? (Math.min(...zs) + Math.max(...zs)) / 2 : z,
      w: sites.length ? Math.max(7.6, Math.max(...xs) - Math.min(...xs) + 6) : 7.6,
      d: sites.length ? Math.max(12.4, Math.max(...zs) - Math.min(...zs) + 6) : 12.4,
      y: 0.14,
    },
    sites,
  };
}

export const installationSpecs: InstallationSpec[] = [rooftopSpec(), streetSpec(), floatingSpec()];

function focusOf(id: InstallationSpec["id"]) {
  const spec = installationSpecs.find((item) => item.id === id);
  const area = spec?.area ?? { x: 0, y: 4, z: 0 };
  return new THREE.Vector3(area.x, Math.max(3, area.y * 0.35), area.z);
}

/** Camera look targets for each installation. Stable objects, safe to reuse every frame. */
export const installationFocus = {
  rooftop: focusOf("rooftop"),
  streetlight: focusOf("streetlight"),
  floating: focusOf("floating"),
} as const;
