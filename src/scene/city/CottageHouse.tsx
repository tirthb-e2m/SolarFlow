"use client";

import { useLoader } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MODEL_URLS } from "@/scene/assets";
import type { CottageSlot } from "@/scene/city/buildCity";

type CottageHouseProps = {
  slot: CottageSlot;
  quality: "high" | "low";
};

/**
 * One review placement of cottage.glb in the villa row.
 * Scale fits the reserved lot; the roof is left empty for now.
 */
export function CottageHouse({ slot, quality }: CottageHouseProps) {
  const gltf = useLoader(GLTFLoader, MODEL_URLS[0]);
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
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
          material.envMapIntensity = 0.75;
          material.needsUpdate = true;
        }
      });
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
