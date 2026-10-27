"use client";

import { useLoader } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MODEL_FALLBACK, MODEL_INDEX, MODEL_URLS, type ModelKey } from "@/scene/assets";

export type SolarFit = {
  scale: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  zUp: boolean;
};

function tuneSolarMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const tuned = materials.map((material) => {
      const mat =
        material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial
          ? material.clone()
          : new THREE.MeshStandardMaterial({ color: "#1a2430" });
      const name = `${child.name} ${mat.name}`.toLowerCase();
      if (name.includes("cell") || name.includes("glass") || name.includes("pv") || name.includes("panel")) {
        mat.color = new THREE.Color("#15202c");
        mat.roughness = 0.22;
        mat.metalness = 0.35;
        mat.envMapIntensity = 1.15;
        if ("emissive" in mat) {
          mat.emissive = new THREE.Color("#6f97ab");
          mat.emissiveIntensity = 0;
        }
      } else if (name.includes("frame") || name.includes("aluminum") || name.includes("rail")) {
        mat.color = new THREE.Color("#c5ced4");
        mat.roughness = 0.38;
        mat.metalness = 0.72;
      } else if (name.includes("pontoon") || name.includes("float")) {
        mat.color = new THREE.Color("#d5dee3");
        mat.roughness = 0.55;
        mat.metalness = 0.2;
      } else {
        mat.roughness = Math.max(mat.roughness ?? 0.5, 0.35);
        mat.metalness = Math.min(mat.metalness ?? 0.2, 0.55);
      }
      mat.needsUpdate = true;
      return mat;
    });
    child.material = Array.isArray(child.material) ? tuned : tuned[0];
  });
}

/** Measure a loaded solar GLB once; callers clone the scene and reuse this fit. */
export function measureSolarModel(scene: THREE.Object3D, asset: ModelKey, targetW: number, targetD: number, pad = 0.9): SolarFit {
  const meta = MODEL_FALLBACK[asset];
  const zUp = meta.zUp === true;
  const probe = scene.clone(true);
  if (zUp) probe.rotation.x = -Math.PI / 2;
  probe.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(probe);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = Math.min(targetW / Math.max(size.x, 0.001), targetD / Math.max(size.z, 0.001)) * pad;
  return {
    scale,
    offsetX: -center.x,
    offsetY: -box.min.y,
    offsetZ: -center.z,
    zUp,
  };
}

export function useSolarGltf(asset: "solarPanelArray" | "floatingSolarArray") {
  const url = MODEL_URLS[MODEL_INDEX[asset]];
  return useLoader(GLTFLoader, url);
}

type SharedSolarProps = {
  asset: "solarPanelArray" | "floatingSolarArray";
  targetW: number;
  targetD: number;
  pad?: number;
  children: (scene: THREE.Object3D, fit: SolarFit) => ReactNode;
  fallback: ReactNode;
};

function LoadedSolar({ asset, targetW, targetD, pad = 0.9, children }: Omit<SharedSolarProps, "fallback">) {
  const gltf = useSolarGltf(asset);
  const template = useMemo(() => {
    const scene = gltf.scene.clone(true);
    tuneSolarMaterials(scene);
    return scene;
  }, [gltf.scene]);
  const fit = useMemo(
    () => measureSolarModel(gltf.scene, asset, targetW, targetD, pad),
    [asset, gltf.scene, pad, targetD, targetW],
  );

  useLayoutEffect(() => {
    tuneSolarMaterials(template);
  }, [template]);

  return <>{children(template, fit)}</>;
}

/**
 * Loads a solar GLB once per asset URL (R3F cache). Renders `fallback` while loading
 * or if the Suspense boundary catches a missing file via parent error boundary.
 */
export function SharedSolarModel(props: SharedSolarProps) {
  return (
    <Suspense fallback={props.fallback}>
      <LoadedSolar {...props} />
    </Suspense>
  );
}

export function cloneSolarInstance(template: THREE.Object3D) {
  return template.clone(true);
}
