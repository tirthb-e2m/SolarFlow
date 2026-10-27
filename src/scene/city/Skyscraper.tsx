"use client";

import { useLoader } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MODEL_INDEX, MODEL_URLS } from "@/scene/assets";
import type { CottageSlot } from "@/scene/city/buildCity";

type SkyscraperProps = {
  slot: CottageSlot;
  quality: "high" | "low";
};

/**
 * Replaces the procedural northwest tower with solarflow_optimized_skyscraper.glb.
 * The model was authored in a Z-up coordinate system; rotation around X by -90 deg
 * aligns it to Y-up with the main entrance facing South towards the boulevard.
 * Scale is fitted to the plaza footprint while giving an imposing, realistic skyscraper scale.
 */
export function Skyscraper({ slot, quality }: SkyscraperProps) {
  const gltf = useLoader(GLTFLoader, MODEL_URLS[MODEL_INDEX.skyscraper]);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // Model size is 15.5m (X) x 12.5m (Y) x 80.5m (Z-up height)
  // Scale of 0.50 fits the 12.2m x 18.4m plaza with 7.75m width, 6.25m depth, and 40.25m height.
  const scale = useMemo(() => {
    return Math.min(slot.targetW / 15.5, slot.targetD / 12.5) * 0.65;
  }, [slot.targetD, slot.targetW]);

  useLayoutEffect(() => {
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.castShadow = quality === "high";
      child.receiveShadow = true;

      const originalMat = child.material;
      const mat = (Array.isArray(originalMat) ? originalMat[0] : originalMat).clone();
      mat.vertexColors = true;

      const name = child.name.toLowerCase();

      // asset_part_05 is the main curtain glass, asset_part_10 is entry glass
      if (name.includes("part_05") || name.includes("part_10")) {
        mat.roughness = 0.1;
        mat.metalness = 0.16;
        mat.envMapIntensity = 1.35;
      } else if (
        name.includes("part_06") || // facade fins / mullions
        name.includes("part_09") || // rooftop cap
        name.includes("part_11") || // entrance canopy
        name.includes("part_12") // vertical architectural trims
      ) {
        mat.roughness = 0.44;
        mat.metalness = 0.3;
        mat.envMapIntensity = 0.9;
      } else {
        // Concrete podium, tower shaft tiers, roof slabs
        mat.roughness = 0.86;
        mat.metalness = 0.04;
        mat.envMapIntensity = 0.75;
      }

      mat.needsUpdate = true;
      child.material = mat;
    });
  }, [scene, quality]);

  return (
    <group position={[slot.x, 0.08, slot.z]} rotation={[0, slot.yaw, 0]}>
      <group scale={scale}>
        {/* Rotate -90 degrees around X to bring the Z-up model into Three.js Y-up world space */}
        <primitive object={scene} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}
