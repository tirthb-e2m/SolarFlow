"use client";

import { useLoader } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MODEL_INDEX, MODEL_URLS } from "@/scene/assets";
import type { CottageSlot } from "@/scene/city/buildCity";

type GptBuildingProps = {
  slot: CottageSlot;
  quality: "high" | "low";
};

/**
 * Placement of gpt.glb in the north villa row.
 * Includes concrete building structure, multi-story windows, rooftop solar panels,
 * HVAC equipment, sidewalk, and street lamp. Materials are tuned to match the city's
 * soft low-poly lighting and color palette while preserving vertex colors.
 */
export function GptBuilding({ slot, quality }: GptBuildingProps) {
  const gltf = useLoader(GLTFLoader, MODEL_URLS[MODEL_INDEX.gpt]);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = Math.min(slot.targetW / Math.max(size.x, 0.001), slot.targetD / Math.max(size.z, 0.001)) * 0.96;
    return {
      scale,
      offsetX: -center.x,
      offsetY: -box.min.y,
      offsetZ: -center.z,
    };
  }, [scene, slot.targetD, slot.targetW]);

  useLayoutEffect(() => {
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.castShadow = quality === "high";
      child.receiveShadow = true;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const tuned = materials.map((m) => {
        const mat = m instanceof THREE.MeshStandardMaterial ? m.clone() : new THREE.MeshStandardMaterial();
        mat.vertexColors = true;

        const name = child.name.toLowerCase();
        if (name.includes("glass")) {
          // Window and door glass
          mat.roughness = 0.12;
          mat.metalness = 0.12;
          mat.envMapIntensity = 1.25;
        } else if (name.includes("solar_panel") || (name.includes("panel") && !name.includes("parapet"))) {
          // Rooftop solar panels
          mat.roughness = 0.26;
          mat.metalness = 0.22;
          mat.envMapIntensity = 1.15;
        } else if (name.includes("lamp") && !name.includes("pole") && !name.includes("arm")) {
          // Warm streetlight lamp glow
          mat.roughness = 0.3;
          mat.metalness = 0.08;
          mat.emissive = new THREE.Color("#ffe89a");
          mat.emissiveIntensity = quality === "high" ? 0.9 : 0.6;
        } else if (
          name.includes("pole") ||
          name.includes("arm") ||
          name.includes("hvac") ||
          name.includes("rail") ||
          name.includes("joint")
        ) {
          // Metal elements (HVAC, rails, pole)
          mat.roughness = 0.45;
          mat.metalness = 0.32;
          mat.envMapIntensity = 0.85;
        } else if (
          name.includes("frame") ||
          name.includes("mullion") ||
          name.includes("door") ||
          name.includes("canopy")
        ) {
          // Frames, mullions, canopy
          mat.roughness = 0.58;
          mat.metalness = 0.12;
          mat.envMapIntensity = 0.8;
        } else {
          // Concrete body, roof slab, parapet, sidewalk
          mat.roughness = 0.88;
          mat.metalness = 0.03;
          mat.envMapIntensity = 0.75;
        }

        mat.needsUpdate = true;
        return mat;
      });

      child.material = Array.isArray(child.material) ? tuned : tuned[0];
    });
  }, [scene, quality]);

  return (
    <group position={[slot.x, 0, slot.z]} rotation={[0, slot.yaw, 0]}>
      <group scale={fit.scale}>
        <primitive object={scene} position={[fit.offsetX, fit.offsetY, fit.offsetZ]} />
      </group>
    </group>
  );
}
