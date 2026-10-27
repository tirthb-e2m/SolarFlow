"use client";

/* Headlights and instance matrices are updated from the clock. */
/* eslint-disable react-hooks/immutability */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { roadLoops } from "@/scene/city/lanes";
import { createTrafficSim, stepTraffic, TRAFFIC_PLAN } from "@/scene/city/trafficSim";
import { VEHICLE_METRICS, type VehicleKind } from "@/scene/city/vehicleMetrics";
import { createVehicleLayers, disposeVehicleLayers } from "@/scene/city/vehicles";
import type { StoryRuntime } from "@/scene/runtime";

const VEHICLE_Y = 0.1;
const SPOT_VEHICLES = [0, 4];

const dummy = new THREE.Object3D();
const forward = new THREE.Vector3();

type Kind = VehicleKind;

function lensGeometry() {
  const geometry = new THREE.SphereGeometry(0.1, 16, 12);
  geometry.scale(1.55, 0.78, 0.48);
  return geometry;
}

function tailGeometry() {
  const geometry = new THREE.SphereGeometry(0.082, 14, 10);
  geometry.scale(1.9, 0.7, 0.46);
  return geometry;
}

function beamGeometry() {
  const geometry = new THREE.ConeGeometry(0.42, 3.4, 10, 1, true);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, -0.05, 1.75);
  return geometry;
}

type TrafficProps = {
  runtime: RefObject<StoryRuntime | null>;
  quality: "high" | "low";
};

export function Traffic({ runtime, quality }: TrafficProps) {
  const sim = useMemo(
    () =>
      createTrafficSim(
        TRAFFIC_PLAN,
        TRAFFIC_PLAN.map((vehicle) => vehicle.distance),
        roadLoops,
      ),
    [],
  );
  const warned = useRef(0);
  const lamps = useMemo(() => {
    const headGeo = lensGeometry();
    const tailGeo = tailGeometry();
    const beamGeo = beamGeometry();
    const headMat = new THREE.MeshStandardMaterial({
      color: "#fffaf0",
      emissive: "#ffe9a8",
      emissiveIntensity: 0.08,
      roughness: 0.18,
      metalness: 0.05,
      toneMapped: false,
    });
    const tailMat = new THREE.MeshStandardMaterial({
      color: "#5a1014",
      emissive: "#ff1e28",
      emissiveIntensity: 0.1,
      roughness: 0.28,
      metalness: 0.04,
      toneMapped: false,
    });
    const beamMat = new THREE.MeshBasicMaterial({
      color: "#ffefc8",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const make = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.InstancedMesh(geometry, material, TRAFFIC_PLAN.length);
      mesh.count = TRAFFIC_PLAN.length;
      mesh.frustumCulled = false;
      return mesh;
    };
    return {
      headGeo,
      tailGeo,
      beamGeo,
      headMat,
      tailMat,
      beamMat,
      headLeft: make(headGeo, headMat),
      headRight: make(headGeo, headMat),
      tailLeft: make(tailGeo, tailMat),
      tailRight: make(tailGeo, tailMat),
      beamLeft: make(beamGeo, beamMat),
      beamRight: make(beamGeo, beamMat),
    };
  }, []);
  const fleet = useMemo(() => {
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.34,
      metalness: 0.42,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
      envMapIntensity: 0.85,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: "#8ea3b2",
      roughness: 0.04,
      metalness: 0.62,
      transparent: true,
      opacity: 0.72,
      envMapIntensity: 1.05,
    });
    const wheelMat = new THREE.MeshStandardMaterial({ color: "#16191d", roughness: 0.9, metalness: 0.06 });
    const trimMat = new THREE.MeshStandardMaterial({ color: "#2a3036", roughness: 0.48, metalness: 0.4 });
    const kinds: Kind[] = ["car", "van", "truck"];
    const counts = { car: 0, van: 0, truck: 0 };
    TRAFFIC_PLAN.forEach((item) => {
      counts[item.kind] += 1;
    });
    const layers = new Map(kinds.map((kind) => [kind, createVehicleLayers(kind)]));
    const meshes = new Map(
      kinds.map((kind) => {
        const geometry = layers.get(kind)!;
        const count = counts[kind];
        const body = new THREE.InstancedMesh(geometry.body, bodyMat, count);
        const glass = new THREE.InstancedMesh(geometry.glass, glassMat, count);
        const wheels = new THREE.InstancedMesh(geometry.wheels, wheelMat, count);
        const trim = new THREE.InstancedMesh(geometry.trim, trimMat, count);
        [body, glass, wheels, trim].forEach((mesh) => {
          mesh.count = count;
          mesh.castShadow = quality === "high" && mesh === body;
          mesh.receiveShadow = true;
        });
        return [kind, { body, glass, wheels, trim }] as const;
      }),
    );
    const slot = { car: 0, van: 0, truck: 0 };
    TRAFFIC_PLAN.forEach((item, index) => {
      const group = meshes.get(item.kind)!;
      const i = slot[item.kind];
      slot[item.kind] += 1;
      dummy.position.set(sim.px[index], VEHICLE_Y, sim.pz[index]);
      dummy.rotation.set(0, sim.yaw[index], 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      group.body.setMatrixAt(i, dummy.matrix);
      group.glass.setMatrixAt(i, dummy.matrix);
      group.wheels.setMatrixAt(i, dummy.matrix);
      group.trim.setMatrixAt(i, dummy.matrix);
      group.body.setColorAt(i, new THREE.Color(item.color));
    });
    meshes.forEach((group) => {
      [group.body, group.glass, group.wheels, group.trim].forEach((mesh) => {
        mesh.instanceMatrix.needsUpdate = true;
      });
      if (group.body.instanceColor) group.body.instanceColor.needsUpdate = true;
    });
    return { bodyMat, glassMat, wheelMat, trimMat, layers, meshes, kinds };
  }, [quality, sim]);
  const spots = useMemo(() => {
    if (quality !== "high") return [];
    return SPOT_VEHICLES.flatMap((vehicle) =>
      (["left", "right"] as const).map((side) => {
        const spot = new THREE.SpotLight("#fff4d6", 0, 15, 0.4, 0.8, 1.45);
        spot.castShadow = false;
        const target = new THREE.Object3D();
        spot.target = target;
        return { vehicle, side, spot, target };
      }),
    );
  }, [quality]);

  useEffect(
    () => () => {
      fleet.bodyMat.dispose();
      fleet.glassMat.dispose();
      fleet.wheelMat.dispose();
      fleet.trimMat.dispose();
      fleet.layers.forEach((layers) => disposeVehicleLayers(layers));
      lamps.headGeo.dispose();
      lamps.tailGeo.dispose();
      lamps.beamGeo.dispose();
      lamps.headMat.dispose();
      lamps.tailMat.dispose();
      lamps.beamMat.dispose();
      spots.forEach((item) => item.spot.dispose());
    },
    [fleet, lamps, spots],
  );

  useFrame((_, delta) => {
    const night = runtime.current?.lamp ?? 0;
    const reduce = runtime.current?.reduceMotion ?? false;
    lamps.headMat.emissiveIntensity = 0.08 + night * 4.2;
    lamps.tailMat.emissiveIntensity = 0.12 + night * 2.8;
    lamps.beamMat.opacity = night < 0.04 ? 0 : night * 0.22;
    lamps.beamLeft.visible = night >= 0.04;
    lamps.beamRight.visible = night >= 0.04;
    const report = stepTraffic(sim, TRAFFIC_PLAN, roadLoops, reduce ? 0 : delta);
    if (process.env.NODE_ENV !== "production" && report.overlaps > 0) {
      const now = performance.now();
      if (now - warned.current > 2000) {
        warned.current = now;
        console.warn(
          `[traffic] ${report.overlaps} overlapping vehicles, clearance ${report.minClearance.toFixed(2)} m`,
        );
      }
    }
    const slot = { car: 0, van: 0, truck: 0 };
    TRAFFIC_PLAN.forEach((item, index) => {
      const yaw = sim.yaw[index];
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      dummy.position.set(sim.px[index], VEHICLE_Y, sim.pz[index]);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      const group = fleet.meshes.get(item.kind)!;
      const at = slot[item.kind];
      slot[item.kind] += 1;
      group.body.setMatrixAt(at, dummy.matrix);
      group.glass.setMatrixAt(at, dummy.matrix);
      group.wheels.setMatrixAt(at, dummy.matrix);
      group.trim.setMatrixAt(at, dummy.matrix);
      const spec = VEHICLE_METRICS[item.kind];
      const placeLamp = (lx: number, ly: number, lz: number, mesh: THREE.InstancedMesh, scale: number) => {
        dummy.position.set(sim.px[index] + cos * lx + sin * lz, ly, sim.pz[index] - sin * lx + cos * lz);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      };
      placeLamp(spec.headX, spec.headY + VEHICLE_Y, spec.headZ, lamps.headLeft, spec.headScale);
      placeLamp(-spec.headX, spec.headY + VEHICLE_Y, spec.headZ, lamps.headRight, spec.headScale);
      placeLamp(spec.tailX, spec.tailY + VEHICLE_Y, spec.tailZ, lamps.tailLeft, spec.tailScale);
      placeLamp(-spec.tailX, spec.tailY + VEHICLE_Y, spec.tailZ, lamps.tailRight, spec.tailScale);
      placeLamp(spec.headX, spec.headY + VEHICLE_Y - 0.04, spec.headZ, lamps.beamLeft, spec.headScale);
      placeLamp(-spec.headX, spec.headY + VEHICLE_Y - 0.04, spec.headZ, lamps.beamRight, spec.headScale);
    });
    spots.forEach((item) => {
      const spec = VEHICLE_METRICS[TRAFFIC_PLAN[item.vehicle].kind];
      const yaw = sim.yaw[item.vehicle];
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      const side = item.side === "left" ? spec.headX : -spec.headX;
      const x = sim.px[item.vehicle] + cos * side + sin * spec.headZ;
      const z = sim.pz[item.vehicle] - sin * side + cos * spec.headZ;
      item.spot.position.set(x, spec.headY + VEHICLE_Y, z);
      forward.set(sin, -0.08, cos);
      item.target.position.set(x, 0.15, z).addScaledVector(forward, 9);
      item.spot.intensity = night * 48;
    });
    lamps.headLeft.instanceMatrix.needsUpdate = true;
    lamps.headRight.instanceMatrix.needsUpdate = true;
    lamps.tailLeft.instanceMatrix.needsUpdate = true;
    lamps.tailRight.instanceMatrix.needsUpdate = true;
    lamps.beamLeft.instanceMatrix.needsUpdate = true;
    lamps.beamRight.instanceMatrix.needsUpdate = true;
    fleet.meshes.forEach((group) => {
      group.body.instanceMatrix.needsUpdate = true;
      group.glass.instanceMatrix.needsUpdate = true;
      group.wheels.instanceMatrix.needsUpdate = true;
      group.trim.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      {fleet.kinds.map((kind) => {
        const group = fleet.meshes.get(kind)!;
        return (
          <group key={kind}>
            <primitive object={group.wheels} />
            <primitive object={group.body} />
            <primitive object={group.trim} />
            <primitive object={group.glass} />
          </group>
        );
      })}
      <primitive object={lamps.headLeft} />
      <primitive object={lamps.headRight} />
      <primitive object={lamps.tailLeft} />
      <primitive object={lamps.tailRight} />
      <primitive object={lamps.beamLeft} />
      <primitive object={lamps.beamRight} />
      {spots.map((item) => (
        <group key={`${item.vehicle}-${item.side}`}>
          <primitive object={item.spot} />
          <primitive object={item.target} />
        </group>
      ))}
    </group>
  );
}
