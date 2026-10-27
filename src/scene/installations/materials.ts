import * as THREE from "three";

export function createFrameMaterial(color = "#d5dbe1") {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.72,
    roughness: 0.36,
  });
}

export function createRailMaterial() {
  return new THREE.MeshStandardMaterial({
    color: "#b7c0c6",
    metalness: 0.64,
    roughness: 0.42,
  });
}

export function createCellMaterial(map: THREE.Texture, emissive = "#6f97ab") {
  return new THREE.MeshStandardMaterial({
    map,
    color: "#d5e0e8",
    emissive,
    emissiveIntensity: 0,
    metalness: 0.55,
    roughness: 0.18,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}

export function createCableMaterial() {
  return new THREE.MeshStandardMaterial({
    color: "#2c343c",
    metalness: 0.35,
    roughness: 0.52,
    transparent: true,
    opacity: 0,
  });
}
