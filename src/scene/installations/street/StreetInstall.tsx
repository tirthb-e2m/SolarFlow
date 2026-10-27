"use client";

/* Head and pool materials follow night level after the feeder arrives. */

import { useGSAP } from "@gsap/react";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { EnergyPath, type EnergyReveal } from "@/scene/installations/energy/EnergyPath";
import { reached } from "@/scene/installations/energy/flow";
import { streetFeed } from "@/scene/installations/energy/routes";
import { createCellMaterial, createFrameMaterial } from "@/scene/installations/materials";
import { ignoreInstallRaycast, steerTimeline } from "@/scene/installations/timeline";
import type { InstallationSpec } from "@/scene/installations/types";
import type { StoryRuntime } from "@/scene/runtime";

type StreetInstallProps = {
  spec: InstallationSpec;
  active: boolean;
  hovered: boolean;
  playId: number;
  runtime: RefObject<StoryRuntime | null>;
  map: THREE.Texture;
  halo: THREE.Texture;
};

export function StreetInstall({ spec, active, hovered, playId, runtime, map, halo }: StreetInstallProps) {
  const panels = useRef<Array<THREE.Group | null>>([]);
  const lights = useRef<Array<THREE.PointLight | null>>([]);
  const frame = useMemo(() => createFrameMaterial("#d8dee3"), []);
  const cells = useMemo(
    () => spec.sites.map(() => createCellMaterial(map, "#8fb4c4")),
    [map, spec.sites],
  );
  const heads = useMemo(
    () =>
      spec.sites.map(
        () =>
          new THREE.MeshStandardMaterial({
            color: "#2c261f",
            emissive: "#ffbf7a",
            emissiveIntensity: 0,
            roughness: 0.42,
            metalness: 0.15,
          }),
      ),
    [spec.sites],
  );
  const pools = useMemo(
    () =>
      spec.sites.map(
        () =>
          new THREE.MeshBasicMaterial({
            map: halo,
            color: "#ffb15a",
            transparent: true,
            opacity: 0,
            depthWrite: false,
            toneMapped: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: -4,
          }),
      ),
    [halo, spec.sites],
  );
  const reveal = useRef<EnergyReveal>({ v: 0 });
  const root = useRef<THREE.Group>(null);
  const sequence = useRef<gsap.core.Timeline | null>(null);
  const charges = useRef(spec.sites.map(() => ({ v: 0 })));
  /** Feed path uses a spaced subset so the ribbon stays readable citywide. */
  const feedSites = useMemo(() => {
    const ordered = [...spec.sites].sort((a, b) => a.x - b.x || a.z - b.z);
    if (ordered.length <= 10) return ordered;
    const step = Math.ceil(ordered.length / 10);
    return ordered.filter((_, index) => index % step === 0).slice(0, 10);
  }, [spec.sites]);
  const run = useMemo(() => streetFeed(feedSites), [feedSites]);

  useEffect(() => {
    charges.current = spec.sites.map(() => ({ v: 0 }));
    panels.current = [];
    lights.current = [];
  }, [spec.sites]);

  useEffect(
    () => () => {
      frame.dispose();
      cells.forEach((material) => material.dispose());
      heads.forEach((material) => material.dispose());
      pools.forEach((material) => material.dispose());
    },
    [cells, frame, heads, pools],
  );

  useGSAP(() => {
    const timeline = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    spec.sites.forEach((_, index) => {
      const panel = panels.current[index];
      const at = (index % 16) * 0.09 + Math.floor(index / 16) * 0.2;
      if (panel) {
        timeline.to(panel.position, { x: 0.22, y: 4.34, duration: 0.85 }, at);
        timeline.to(panel.rotation, { z: 0.4, duration: 0.85 }, at);
      }
      timeline.to(charges.current[index], { v: 0.45, duration: 0.35 }, at + 0.5);
    });
    sequence.current = timeline;
    return () => {
      timeline.kill();
      sequence.current = null;
    };
  }, { dependencies: [playId, spec.sites.length] });

  useEffect(() => {
    steerTimeline(sequence.current, active, hovered, runtime.current?.reduceMotion ?? false);
  }, [active, hovered, playId, runtime]);

  useFrame(() => {
    if (root.current) {
      const progress = sequence.current?.progress() ?? 0;
      root.current.visible = active || hovered || progress > 0.01;
    }
    const night = runtime.current?.lamp ?? 1 - (runtime.current?.day ?? 1);
    const dayFactor = THREE.MathUtils.clamp(night, 0, 1);
    const first = run.points[0];
    const last = run.points[run.points.length - 1] ?? first;
    const spanX = Math.max(0.001, Math.abs((last?.x ?? 0) - (first?.x ?? 0)));
    const spanZ = Math.max(0.001, Math.abs((last?.z ?? 0) - (first?.z ?? 0)));
    const useX = spanX >= spanZ;
    spec.sites.forEach((site, index) => {
      const t = useX
        ? ((site.x - (first?.x ?? site.x)) / spanX)
        : ((site.z - (first?.z ?? site.z)) / spanZ);
      const live = reached(reveal.current.v, THREE.MathUtils.clamp(t, 0, 1));
      const generation = runtime.current?.generation ?? 1;
      const cell = cells[index];
      if (cell) cell.emissiveIntensity = charges.current[index].v * generation;
      const head = heads[index];
      // Warm glow only at night; daylight keeps heads nearly off.
      if (head) head.emissiveIntensity = live * dayFactor * (0.15 + dayFactor * 1.05);
      const lamp = lights.current[index];
      const pool = pools[index];
      if (lamp) lamp.intensity = live * dayFactor * (0.08 + dayFactor * 1.35);
      if (pool) pool.opacity = live * dayFactor * (0.05 + dayFactor * 0.28);
    });
  });

  return (
    <group ref={root} visible={false}>
      <EnergyPath points={run.points} reveal={reveal} active={active} playId={playId} delay={0.85} runtime={runtime} />
      {spec.sites.map((site, index) => (
        <group key={`${site.x.toFixed(2)}:${site.z.toFixed(2)}:${index}`}>
          <group position={[site.x, 0, site.z]} rotation={[0, site.yaw, 0]}>
            <group
              ref={(node) => {
                panels.current[index] = node;
                if (node && node.userData.posed !== true) {
                  node.position.set(0.1, 4.95, 0);
                  node.rotation.z = 1.05;
                  node.userData.posed = true;
                }
              }}
            >
              {/* Compact canopy PV — sized to the lamp head, not a rooftop array. */}
              <mesh material={frame} raycast={ignoreInstallRaycast}>
                <boxGeometry args={[0.58, 0.025, 0.34]} />
              </mesh>
              <mesh material={cells[index]} position={[0, 0.018, 0]} raycast={ignoreInstallRaycast}>
                <boxGeometry args={[0.48, 0.01, 0.26]} />
              </mesh>
              <mesh material={frame} position={[0, -0.035, 0]} raycast={ignoreInstallRaycast}>
                <boxGeometry args={[0.05, 0.06, 0.22]} />
              </mesh>
            </group>
            <mesh material={heads[index]} position={[0.52, 4.09, 0]} raycast={ignoreInstallRaycast}>
              <boxGeometry args={[0.22, 0.05, 0.14]} />
            </mesh>
            {index % Math.max(1, Math.ceil(spec.sites.length / 12)) === 0 ? (
              <pointLight
                ref={(node) => {
                  lights.current[index] = node;
                }}
                position={[0.55, 3.95, 0]}
                color="#ffb56a"
                distance={7.5}
                decay={2}
                intensity={0}
              />
            ) : null}
          </group>
          <mesh
            material={pools[index]}
            position={[site.x, 0.2, site.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            raycast={ignoreInstallRaycast}
          >
            <planeGeometry args={[3.4, 2.5]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
