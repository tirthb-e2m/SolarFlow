"use client";

import { useLoader } from "@react-three/fiber";
import { Component, Suspense, useLayoutEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MODEL_FALLBACK, MODEL_INDEX, MODEL_URLS, type ModelKey } from "@/scene/assets";

export type PropSlot = {
  asset: ModelKey;
  x: number;
  z: number;
  yaw: number;
  targetW: number;
  targetD: number;
  /** Optional uniform scale multiplier after footprint fit. */
  fit?: number;
};

type GlbPropProps = {
  slot: PropSlot;
  quality: "high" | "low";
};

function tuneMaterials(root: THREE.Object3D, quality: "high" | "low") {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = quality === "high";
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const tuned = materials.map((material) => {
      const mat =
        material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial
          ? material.clone()
          : new THREE.MeshStandardMaterial({ color: "#c8cdd3" });
      const name = `${child.name} ${mat.name}`.toLowerCase();
      if (name.includes("glass") || name.includes("window")) {
        mat.roughness = 0.12;
        mat.metalness = 0.14;
        mat.envMapIntensity = 1.25;
      } else if (name.includes("solar") || name.includes("panel")) {
        mat.roughness = 0.28;
        mat.metalness = 0.22;
        mat.envMapIntensity = 1.1;
      } else if (name.includes("metal") || name.includes("steel") || name.includes("frame")) {
        mat.roughness = 0.45;
        mat.metalness = 0.35;
        mat.envMapIntensity = 0.9;
      } else if (name.includes("leaf") || name.includes("foliage") || name.includes("canopy")) {
        mat.roughness = 0.82;
        mat.metalness = 0.02;
        mat.envMapIntensity = 0.7;
      } else {
        mat.roughness = Math.max(mat.roughness ?? 0.7, 0.55);
        mat.metalness = Math.min(mat.metalness ?? 0.08, 0.25);
        mat.envMapIntensity = 0.8;
      }
      mat.needsUpdate = true;
      return mat;
    });
    child.material = Array.isArray(child.material) ? tuned : tuned[0];
  });
}

function FallbackMass({ slot }: { slot: PropSlot }) {
  const fallback = MODEL_FALLBACK[slot.asset];
  const h = Math.min(Math.max(4, fallback.h * (slot.targetW / Math.max(fallback.w, 1)) * 0.85), 48);
  return (
    <group position={[slot.x, 0, slot.z]} rotation={[0, slot.yaw, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[slot.targetW * 0.92, h, slot.targetD * 0.92]} />
        <meshStandardMaterial color="#c5ccd3" roughness={0.82} metalness={0.06} />
      </mesh>
      <mesh position={[0, h + 0.08, 0]} receiveShadow>
        <boxGeometry args={[slot.targetW * 0.88, 0.16, slot.targetD * 0.88]} />
        <meshStandardMaterial color="#8b9198" roughness={0.9} metalness={0.04} />
      </mesh>
    </group>
  );
}

class PropBoundary extends Component<{ slot: PropSlot; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <FallbackMass slot={this.props.slot} />;
    return this.props.children;
  }
}

function LoadedProp({ slot, quality }: GlbPropProps) {
  const url = MODEL_URLS[MODEL_INDEX[slot.asset]];
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const meta = MODEL_FALLBACK[slot.asset];
  const zUp = meta.zUp === true;
  const fit = useMemo(() => {
    const pad = slot.fit ?? 0.88;
    const scale = Math.min(slot.targetW / Math.max(meta.w, 0.001), slot.targetD / Math.max(meta.d, 0.001)) * pad;
    return { scale };
  }, [meta.d, meta.w, slot.fit, slot.targetD, slot.targetW]);

  const ground = useMemo(() => {
    const probe = scene.clone(true);
    if (zUp) probe.rotation.x = -Math.PI / 2;
    probe.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(probe);
    const center = box.getCenter(new THREE.Vector3());
    return { x: -center.x, y: -box.min.y, z: -center.z };
  }, [scene, zUp]);

  useLayoutEffect(() => {
    tuneMaterials(scene, quality);
  }, [scene, quality]);

  return (
    <group position={[slot.x, 0, slot.z]} rotation={[0, slot.yaw, 0]}>
      <group scale={fit.scale}>
        <primitive
          object={scene}
          rotation={zUp ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
          position={[ground.x, ground.y, ground.z]}
        />
      </group>
    </group>
  );
}

/**
 * Loads a city GLB into a reserved lot. Missing or broken files fall back to a
 * simple mass so the scene never crashes.
 */
export function GlbProp({ slot, quality }: GlbPropProps) {
  return (
    <PropBoundary slot={slot}>
      <Suspense fallback={<FallbackMass slot={slot} />}>
        <LoadedProp slot={slot} quality={quality} />
      </Suspense>
    </PropBoundary>
  );
}
