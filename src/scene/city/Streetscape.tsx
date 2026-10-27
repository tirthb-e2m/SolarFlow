"use client";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MODEL_FALLBACK, MODEL_INDEX, MODEL_URLS } from "@/scene/assets";
import type { LampSpot, TreeSpot } from "@/scene/city/buildCity";
import type { StoryRuntime } from "@/scene/runtime";

const TREE_ASSETS = ["treeBroad", "treeEvergreen", "treeOrnamental"] as const;

const swayDummy = new THREE.Object3D();
const placeDummy = new THREE.Object3D();
const look = new THREE.Vector3();

function mergeObjectGeometry(root: THREE.Object3D, zUp: boolean) {
  const geometries: THREE.BufferGeometry[] = [];
  const clone = root.clone(true);
  if (zUp) clone.rotation.x = -Math.PI / 2;
  clone.updateMatrixWorld(true);
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    const geo = child.geometry.clone();
    if (geo.index) {
      const flat = geo.toNonIndexed();
      geo.dispose();
      flat.applyMatrix4(child.matrixWorld);
      geometries.push(flat);
    } else {
      geo.applyMatrix4(child.matrixWorld);
      geometries.push(geo);
    }
  });
  if (geometries.length === 0) return null;
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geo) => geo.dispose());
  if (!merged) return null;
  const box = new THREE.Box3().setFromBufferAttribute(merged.attributes.position as THREE.BufferAttribute);
  const center = box.getCenter(new THREE.Vector3());
  merged.translate(-center.x, -box.min.y, -center.z);
  merged.computeVertexNormals();
  // Drop UV/color extras — instances use flat materials.
  merged.deleteAttribute("uv");
  merged.deleteAttribute("uv2");
  return { geometry: merged, height: Math.max(0.1, box.max.y - box.min.y) };
}

function useMergedModel(url: string, zUp: boolean) {
  const gltf = useLoader(GLTFLoader, url);
  const merged = useMemo(() => mergeObjectGeometry(gltf.scene, zUp), [gltf.scene, zUp]);
  useEffect(
    () => () => {
      merged?.geometry.dispose();
    },
    [merged],
  );
  return merged;
}

type StreetscapeProps = {
  trees: TreeSpot[];
  lamps: LampSpot[];
  quality: "high" | "low";
  runtime: RefObject<StoryRuntime | null>;
  treeSway?: boolean;
};

function TreeField({
  trees,
  quality,
  runtime,
  treeSway = true,
  broad,
  evergreen,
  ornamental,
}: {
  trees: TreeSpot[];
  quality: "high" | "low";
  runtime: RefObject<StoryRuntime | null>;
  treeSway?: boolean;
  broad: ReturnType<typeof mergeObjectGeometry>;
  evergreen: ReturnType<typeof mergeObjectGeometry>;
  ornamental: ReturnType<typeof mergeObjectGeometry>;
}) {
  const wind = useRef(0);
  const frame = useRef(0);
  const { camera } = useThree();
  const models = useMemo(() => [broad, evergreen, ornamental], [broad, evergreen, ornamental]);
  const hideDistance = quality === "high" ? 130 : 95;
  const swayDistance = quality === "high" ? 70 : 0;

  const layers = useMemo(() => {
    const counts = [0, 0, 0];
    trees.forEach((tree) => {
      const kind = tree.kind === 1 ? 1 : tree.kind === 2 ? 2 : 0;
      counts[kind] += 1;
    });
    const base = new THREE.MeshStandardMaterial({ color: "#4a6f3c", roughness: 0.86, metalness: 0.02 });
    const mats = [base, base.clone(), base.clone()];
    mats[1].color.set("#2a4a34");
    mats[2].color.set("#5a7d42");
    return models.map((model, kind) => {
      if (!model || counts[kind] === 0) return null;
      const mesh = new THREE.InstancedMesh(model.geometry, mats[kind], counts[kind]);
      mesh.castShadow = false;
      mesh.receiveShadow = quality === "high";
      mesh.frustumCulled = true;
      return { mesh, model, mat: mats[kind] };
    });
  }, [models, quality, trees]);

  const records = useMemo(() => {
    const slots = [0, 0, 0];
    const out = layers.map((layer) =>
      layer
        ? {
            mesh: layer.mesh,
            index: [] as number[],
            x: [] as number[],
            y: [] as number[],
            z: [] as number[],
            s: [] as number[],
            yaw: [] as number[],
            visible: [] as boolean[],
          }
        : null,
    );
    trees.forEach((tree) => {
      const kind = tree.kind === 1 ? 1 : tree.kind === 2 ? 2 : 0;
      const layer = layers[kind];
      const rec = out[kind];
      if (!layer || !rec) return;
      const i = slots[kind];
      slots[kind] += 1;
      const targetH = kind === 2 ? 2.4 + tree.s * 1.4 : kind === 1 ? 5.5 + tree.s * 2.2 : 5.2 + tree.s * 2.4;
      const scale = targetH / layer.model.height;
      const yaw = Math.sin(tree.x * 12.1 + tree.z * 7.3) * Math.PI;
      placeDummy.position.set(tree.x, 0, tree.z);
      placeDummy.rotation.set(0, yaw, 0);
      placeDummy.scale.setScalar(scale);
      placeDummy.updateMatrix();
      layer.mesh.setMatrixAt(i, placeDummy.matrix);
      rec.index.push(i);
      rec.x.push(tree.x);
      rec.y.push(0);
      rec.z.push(tree.z);
      rec.s.push(scale);
      rec.yaw.push(yaw);
      rec.visible.push(true);
    });
    layers.forEach((layer) => {
      if (layer) layer.mesh.instanceMatrix.needsUpdate = true;
    });
    return out;
  }, [layers, trees]);

  useEffect(
    () => () => {
      layers.forEach((layer) => {
        if (!layer) return;
        layer.mesh.dispose();
        layer.mat.dispose();
      });
    },
    [layers],
  );

  useFrame((_, delta) => {
    frame.current += 1;
    // LOD + sway at a reduced cadence to cut CPU on mid-range devices.
    if (frame.current % 2 !== 0) return;
    camera.getWorldPosition(look);
    const hideSq = hideDistance * hideDistance;
    const swaySq = swayDistance * swayDistance;
    const allowSway = treeSway && !runtime.current?.reduceMotion && swayDistance > 0;
    if (allowSway) wind.current += delta * 2;
    const time = wind.current;
    records.forEach((rec) => {
      if (!rec) return;
      let dirty = false;
      for (let i = 0; i < rec.index.length; i += 1) {
        const dx = rec.x[i] - look.x;
        const dz = rec.z[i] - look.z;
        const distSq = dx * dx + dz * dz;
        const show = distSq <= hideSq;
        if (!show) {
          if (rec.visible[i]) {
            swayDummy.position.set(rec.x[i], rec.y[i], rec.z[i]);
            swayDummy.rotation.set(0, rec.yaw[i], 0);
            swayDummy.scale.setScalar(0.001);
            swayDummy.updateMatrix();
            rec.mesh.setMatrixAt(rec.index[i], swayDummy.matrix);
            rec.visible[i] = false;
            dirty = true;
          }
          continue;
        }
        const near = allowSway && distSq <= swaySq;
        if (!near && rec.visible[i] && frame.current % 8 !== 0) continue;
        swayDummy.position.set(rec.x[i], rec.y[i], rec.z[i]);
        if (near) {
          swayDummy.rotation.set(
            Math.sin(time * 0.85 + i * 0.7) * 0.012,
            rec.yaw[i] + Math.sin(time * 0.55 + i) * 0.02,
            Math.sin(time * 0.7 + i * 1.3) * 0.01,
          );
        } else {
          swayDummy.rotation.set(0, rec.yaw[i], 0);
        }
        swayDummy.scale.setScalar(rec.s[i]);
        swayDummy.updateMatrix();
        rec.mesh.setMatrixAt(rec.index[i], swayDummy.matrix);
        rec.visible[i] = true;
        dirty = true;
      }
      if (dirty) rec.mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      {layers.map((layer, index) => (layer ? <primitive key={TREE_ASSETS[index]} object={layer.mesh} /> : null))}
    </group>
  );
}

function LampField({
  lamps,
  quality,
  modern,
  solar,
}: {
  lamps: LampSpot[];
  quality: "high" | "low";
  modern: ReturnType<typeof mergeObjectGeometry>;
  solar: ReturnType<typeof mergeObjectGeometry>;
}) {
  const meshes = useMemo(() => {
    let modernCount = 0;
    let solarCount = 0;
    lamps.forEach((lamp) => {
      if (lamp.solar) solarCount += 1;
      else modernCount += 1;
    });
    const modernMat = new THREE.MeshStandardMaterial({ color: "#3a414a", roughness: 0.48, metalness: 0.55 });
    const solarMat = new THREE.MeshStandardMaterial({ color: "#2f363e", roughness: 0.42, metalness: 0.6 });
    const modernMesh =
      modern && modernCount > 0 ? new THREE.InstancedMesh(modern.geometry, modernMat, modernCount) : null;
    const solarMesh = solar && solarCount > 0 ? new THREE.InstancedMesh(solar.geometry, solarMat, solarCount) : null;
    if (modernMesh) {
      modernMesh.castShadow = false;
      modernMesh.receiveShadow = quality === "high";
      modernMesh.frustumCulled = true;
    }
    if (solarMesh) {
      solarMesh.castShadow = false;
      solarMesh.receiveShadow = quality === "high";
      solarMesh.frustumCulled = true;
    }
    let mi = 0;
    let si = 0;
    lamps.forEach((lamp) => {
      const model = lamp.solar ? solar : modern;
      const mesh = lamp.solar ? solarMesh : modernMesh;
      if (!model || !mesh) return;
      const scale = 4.2 / model.height;
      placeDummy.position.set(lamp.x, 0, lamp.z);
      placeDummy.rotation.set(0, lamp.yaw, 0);
      placeDummy.scale.setScalar(scale);
      placeDummy.updateMatrix();
      mesh.setMatrixAt(lamp.solar ? si++ : mi++, placeDummy.matrix);
    });
    if (modernMesh) modernMesh.instanceMatrix.needsUpdate = true;
    if (solarMesh) solarMesh.instanceMatrix.needsUpdate = true;
    return { modernMesh, solarMesh, modernMat, solarMat };
  }, [lamps, modern, quality, solar]);

  useEffect(
    () => () => {
      meshes.modernMesh?.dispose();
      meshes.solarMesh?.dispose();
      meshes.modernMat.dispose();
      meshes.solarMat.dispose();
    },
    [meshes],
  );

  return (
    <group>
      {meshes.modernMesh ? <primitive object={meshes.modernMesh} /> : null}
      {meshes.solarMesh ? <primitive object={meshes.solarMesh} /> : null}
    </group>
  );
}

function StreetscapeInner({ trees, lamps, quality, runtime, treeSway }: StreetscapeProps) {
  const broad = useMergedModel(MODEL_URLS[MODEL_INDEX.treeBroad], MODEL_FALLBACK.treeBroad.zUp === true);
  const evergreen = useMergedModel(MODEL_URLS[MODEL_INDEX.treeEvergreen], true);
  const ornamental = useMergedModel(MODEL_URLS[MODEL_INDEX.treeOrnamental], true);
  const modern = useMergedModel(MODEL_URLS[MODEL_INDEX.streetlightModern], true);
  const solar = useMergedModel(MODEL_URLS[MODEL_INDEX.streetlightSolar], true);
  // Trees are already thinned in buildCity; low quality keeps a further half for GPU headroom.
  const treeBudget = quality === "high" ? trees : trees.filter((_, index) => index % 2 === 0);
  const lampBudget = quality === "high" ? lamps : lamps.filter((_, index) => index % 2 === 0);

  return (
    <group>
      <TreeField
        trees={treeBudget}
        quality={quality}
        runtime={runtime}
        treeSway={treeSway}
        broad={broad}
        evergreen={evergreen}
        ornamental={ornamental}
      />
      <LampField lamps={lampBudget} quality={quality} modern={modern} solar={solar} />
    </group>
  );
}

/**
 * Instanced GLB trees (three silhouettes) and streetlights. Falls back silently
 * when a model cannot be merged.
 */
export function Streetscape(props: StreetscapeProps) {
  return (
    <Suspense fallback={null}>
      <StreetscapeInner {...props} />
    </Suspense>
  );
}
