import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";
import { VEHICLE_METRICS, type VehicleKind } from "@/scene/city/vehicleMetrics";

export type { VehicleKind } from "@/scene/city/vehicleMetrics";

export type VehicleLayers = {
  body: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  wheels: THREE.BufferGeometry;
  trim: THREE.BufferGeometry;
};

function merge(parts: THREE.BufferGeometry[], label: string) {
  const normalized = parts.map((part) => {
    if (!part.index) return part;
    const flat = part.toNonIndexed();
    part.dispose();
    return flat;
  });
  const geometry = mergeGeometries(normalized, false);
  normalized.forEach((part) => part.dispose());
  if (!geometry) throw new Error(`Could not build ${label}`);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function rounded(w: number, h: number, d: number, x: number, y: number, z: number, radius: number) {
  const limit = Math.min(w, h, d) * 0.45;
  const geo = new RoundedBoxGeometry(w, h, d, 2, Math.max(0.02, Math.min(radius, limit)));
  geo.translate(x, y, z);
  return geo;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  return geo;
}

function wheel(x: number, z: number, radius: number, width: number) {
  const tire = new THREE.CylinderGeometry(radius, radius, width, 18);
  tire.rotateZ(Math.PI / 2);
  tire.translate(x, radius, z);
  const hub = new THREE.CylinderGeometry(radius * 0.42, radius * 0.42, width + 0.025, 10);
  hub.rotateZ(Math.PI / 2);
  hub.translate(x, radius, z);
  return [tire, hub];
}

function carLayers(): VehicleLayers {
  const spec = VEHICLE_METRICS.car;
  const body = [
    rounded(1.64, 0.34, 3.55, 0, 0.4, 0.02, 0.1),
    rounded(1.56, 0.22, 1.35, 0, 0.66, 1.18, 0.06),
    rounded(1.48, 0.42, 1.72, 0, 0.92, -0.22, 0.12),
    rounded(1.5, 0.16, 0.95, 0, 0.68, -1.32, 0.05),
  ];
  const glass = [
    rounded(1.28, 0.3, 1.42, 0, 0.96, -0.2, 0.08),
    box(1.22, 0.28, 0.04, 0, 0.94, 0.62),
    box(1.18, 0.22, 0.04, 0, 0.9, -0.98),
  ];
  const wheels = [
    ...wheel(0.78, 1.28, 0.3, 0.18),
    ...wheel(-0.78, 1.28, 0.3, 0.18),
    ...wheel(0.78, -1.22, 0.3, 0.18),
    ...wheel(-0.78, -1.22, 0.3, 0.18),
  ];
  const trim = [
    box(1.68, 0.16, 0.14, 0, 0.34, spec.nose - 0.08),
    box(1.66, 0.14, 0.12, 0, 0.36, -spec.tail + 0.08),
    box(0.72, 0.1, 0.04, 0, 0.48, spec.nose - 0.02),
    box(0.34, 0.14, 0.06, spec.headX, spec.headY, spec.headZ - 0.04),
    box(0.34, 0.14, 0.06, -spec.headX, spec.headY, spec.headZ - 0.04),
    box(0.38, 0.1, 0.05, spec.tailX, spec.tailY, spec.tailZ + 0.03),
    box(0.38, 0.1, 0.05, -spec.tailX, spec.tailY, spec.tailZ + 0.03),
    rounded(0.14, 0.1, 0.18, 0.86, 0.96, 0.48, 0.03),
    rounded(0.14, 0.1, 0.18, -0.86, 0.96, 0.48, 0.03),
  ];
  return {
    body: merge(body, "a car body"),
    glass: merge(glass, "car glass"),
    wheels: merge(wheels, "car wheels"),
    trim: merge(trim, "car trim"),
  };
}

function vanLayers(): VehicleLayers {
  const spec = VEHICLE_METRICS.van;
  const body = [
    rounded(1.78, 0.36, 4.15, 0, 0.42, -0.05, 0.1),
    rounded(1.72, 0.78, 2.55, 0, 1.05, -0.55, 0.12),
    rounded(1.66, 0.2, 1.15, 0, 0.7, 1.25, 0.06),
  ];
  const glass = [
    box(1.48, 0.42, 0.04, 0, 1.08, 0.72),
    box(0.04, 0.46, 1.7, 0.86, 1.08, -0.35),
    box(0.04, 0.46, 1.7, -0.86, 1.08, -0.35),
  ];
  const wheels = [
    ...wheel(0.86, 1.42, 0.32, 0.2),
    ...wheel(-0.86, 1.42, 0.32, 0.2),
    ...wheel(0.86, -1.45, 0.32, 0.2),
    ...wheel(-0.86, -1.45, 0.32, 0.2),
  ];
  const trim = [
    box(1.82, 0.16, 0.14, 0, 0.36, spec.nose - 0.08),
    box(1.8, 0.14, 0.12, 0, 0.4, -spec.tail + 0.08),
    box(0.36, 0.14, 0.06, spec.headX, spec.headY, spec.headZ - 0.04),
    box(0.36, 0.14, 0.06, -spec.headX, spec.headY, spec.headZ - 0.04),
    box(0.4, 0.12, 0.05, spec.tailX, spec.tailY, spec.tailZ + 0.03),
    box(0.4, 0.12, 0.05, -spec.tailX, spec.tailY, spec.tailZ + 0.03),
    rounded(0.16, 0.12, 0.2, 0.96, 1.05, 0.55, 0.03),
    rounded(0.16, 0.12, 0.2, -0.96, 1.05, 0.55, 0.03),
  ];
  return {
    body: merge(body, "a van body"),
    glass: merge(glass, "van glass"),
    wheels: merge(wheels, "van wheels"),
    trim: merge(trim, "van trim"),
  };
}

function truckLayers(): VehicleLayers {
  const spec = VEHICLE_METRICS.truck;
  const body = [
    rounded(1.92, 0.42, 4.7, 0, 0.48, -0.35, 0.08),
    rounded(1.88, 1.35, 3.15, 0, 1.38, -1.15, 0.08),
    rounded(1.84, 0.72, 1.55, 0, 0.95, 1.25, 0.1),
    rounded(1.7, 0.48, 1.05, 0, 1.48, 1.05, 0.08),
  ];
  const glass = [
    box(1.52, 0.4, 0.04, 0, 1.48, 1.58),
    box(0.04, 0.36, 0.72, 0.9, 1.46, 1.15),
    box(0.04, 0.36, 0.72, -0.9, 1.46, 1.15),
  ];
  const wheels = [
    ...wheel(0.92, 1.45, 0.36, 0.22),
    ...wheel(-0.92, 1.45, 0.36, 0.22),
    ...wheel(0.92, -0.55, 0.36, 0.22),
    ...wheel(-0.92, -0.55, 0.36, 0.22),
    ...wheel(0.92, -1.85, 0.36, 0.22),
    ...wheel(-0.92, -1.85, 0.36, 0.22),
  ];
  const trim = [
    box(1.96, 0.18, 0.16, 0, 0.4, spec.nose - 0.08),
    box(1.94, 0.16, 0.12, 0, 0.48, -spec.tail + 0.08),
    box(0.9, 0.16, 0.05, 0, 0.62, spec.nose - 0.02),
    box(0.32, 0.16, 0.07, spec.headX, spec.headY, spec.headZ - 0.04),
    box(0.32, 0.16, 0.07, -spec.headX, spec.headY, spec.headZ - 0.04),
    box(0.42, 0.14, 0.05, spec.tailX, spec.tailY, spec.tailZ + 0.03),
    box(0.42, 0.14, 0.05, -spec.tailX, spec.tailY, spec.tailZ + 0.03),
    rounded(0.16, 0.12, 0.18, 1.0, 1.15, 1.35, 0.03),
    rounded(0.16, 0.12, 0.18, -1.0, 1.15, 1.35, 0.03),
  ];
  return {
    body: merge(body, "a truck body"),
    glass: merge(glass, "truck glass"),
    wheels: merge(wheels, "truck wheels"),
    trim: merge(trim, "truck trim"),
  };
}

export function createVehicleLayers(kind: VehicleKind): VehicleLayers {
  if (kind === "truck") return truckLayers();
  if (kind === "van") return vanLayers();
  return carLayers();
}

export function disposeVehicleLayers(layers: VehicleLayers) {
  layers.body.dispose();
  layers.glass.dispose();
  layers.wheels.dispose();
  layers.trim.dispose();
}
