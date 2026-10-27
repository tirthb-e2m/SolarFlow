"use client";

/* Window and cabinet materials brighten as the feeder arrives. */
/* eslint-disable react-hooks/immutability */

import { useGSAP } from "@gsap/react";
import { useFrame, useLoader } from "@react-three/fiber";
import gsap from "gsap";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MODEL_INDEX, MODEL_URLS } from "@/scene/assets";
import { EnergyPath, type EnergyReveal } from "@/scene/installations/energy/EnergyPath";
import { reached } from "@/scene/installations/energy/flow";
import { rooftopFeed } from "@/scene/installations/energy/routes";
import { createCellMaterial, createFrameMaterial, createRailMaterial } from "@/scene/installations/materials";
import { cloneSolarInstance, measureSolarModel } from "@/scene/installations/SolarModel";
import { rooftopFocusSite } from "@/scene/installations/solarSites";
import { ignoreInstallRaycast, steerTimeline } from "@/scene/installations/timeline";
import type { InstallationSite } from "@/scene/installations/types";
import type { StoryRuntime } from "@/scene/runtime";

type RooftopInstallProps = {
  sites: InstallationSite[];
  active: boolean;
  hovered: boolean;
  playId: number;
  runtime: RefObject<StoryRuntime | null>;
  map: THREE.Texture;
};

function posePanel(node: THREE.Group, site: InstallationSite, index: number, startLift: number) {
  if (node.userData.posed === true) return;
  node.position.set(site.x, site.y + startLift, site.z);
  node.rotation.set(0.75, site.yaw, 0);
  node.userData.posed = true;
  node.userData.restY = site.y + 0.08;
  node.userData.restRotX = 0.12;
  node.userData.index = index;
}

function ProceduralArray({
  site,
  map,
  panelRefs,
  onReady,
  index,
}: {
  site: InstallationSite;
  map: THREE.Texture;
  panelRefs: MutableRefObject<Array<THREE.Group | null>>;
  onReady: () => void;
  index: number;
}) {
  const frame = useMemo(() => createFrameMaterial(), []);
  const rail = useMemo(() => createRailMaterial(), []);
  const cell = useMemo(() => createCellMaterial(map), [map]);
  useEffect(
    () => () => {
      frame.dispose();
      rail.dispose();
      cell.dispose();
    },
    [cell, frame, rail],
  );
  const w = Math.min(site.w, 4.2);
  const d = Math.min(site.d, 3.6);
  return (
    <group
      ref={(node) => {
        panelRefs.current[index] = node;
        if (node) {
          const first = node.userData.posed !== true;
          posePanel(node, site, index, 1.2);
          if (first) onReady();
        }
      }}
    >
      <mesh material={rail} position={[0, -0.05, 0]} raycast={ignoreInstallRaycast}>
        <boxGeometry args={[w * 0.92, 0.05, 0.07]} />
      </mesh>
      <mesh material={frame} raycast={ignoreInstallRaycast}>
        <boxGeometry args={[w, 0.04, d]} />
      </mesh>
      <mesh material={cell} position={[0, 0.028, 0]} raycast={ignoreInstallRaycast}>
        <boxGeometry args={[w - 0.1, 0.012, d - 0.1]} />
      </mesh>
    </group>
  );
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function tuneClone(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const tuned = materials.map((material) => {
      const mat =
        material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial
          ? material.clone()
          : new THREE.MeshStandardMaterial({ color: "#15202c" });
      const name = `${child.name} ${mat.name}`.toLowerCase();
      if (name.includes("cell") || name.includes("glass") || name.includes("pv") || name.includes("panel")) {
        mat.color = new THREE.Color("#15202c");
        mat.roughness = 0.22;
        mat.metalness = 0.35;
        mat.emissive = new THREE.Color("#6f97ab");
        mat.emissiveIntensity = 0;
      } else if (name.includes("frame") || name.includes("aluminum") || name.includes("rail")) {
        mat.color = new THREE.Color("#c5ced4");
        mat.roughness = 0.38;
        mat.metalness = 0.7;
      }
      mat.needsUpdate = true;
      return mat;
    });
    child.material = Array.isArray(child.material) ? tuned : tuned[0];
  });
}

function GlbRoofUnit({
  site,
  index,
  template,
  panelRefs,
  onReady,
}: {
  site: InstallationSite;
  index: number;
  template: THREE.Object3D;
  panelRefs: MutableRefObject<Array<THREE.Group | null>>;
  onReady: () => void;
}) {
  const scene = useMemo(() => {
    const clone = cloneSolarInstance(template);
    tuneClone(clone);
    return clone;
  }, [template]);
  const fit = useMemo(
    () => measureSolarModel(template, "solarPanelArray", site.w, site.d, 0.82),
    [site.d, site.w, template],
  );
  return (
    <group
      ref={(node) => {
        panelRefs.current[index] = node;
        if (node) {
          const first = node.userData.posed !== true;
          posePanel(node, site, index, 1.35);
          if (first) onReady();
        }
      }}
    >
      <group scale={fit.scale}>
        <primitive
          object={scene}
          rotation={fit.zUp ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
          position={[fit.offsetX, fit.offsetY, fit.offsetZ]}
        />
      </group>
    </group>
  );
}

function GlbRooftopField({
  sites,
  panelRefs,
  onReady,
}: {
  sites: InstallationSite[];
  panelRefs: MutableRefObject<Array<THREE.Group | null>>;
  onReady: () => void;
}) {
  const gltf = useLoader(GLTFLoader, MODEL_URLS[MODEL_INDEX.solarPanelArray]);
  return (
    <group>
      {sites.map((site, index) => (
        <GlbRoofUnit
          key={`roof-${index}-${site.x.toFixed(1)}-${site.z.toFixed(1)}`}
          site={site}
          index={index}
          template={gltf.scene}
          panelRefs={panelRefs}
          onReady={onReady}
        />
      ))}
    </group>
  );
}

function ProceduralField({
  sites,
  map,
  panelRefs,
  onReady,
}: {
  sites: InstallationSite[];
  map: THREE.Texture;
  panelRefs: MutableRefObject<Array<THREE.Group | null>>;
  onReady: () => void;
}) {
  return (
    <group>
      {sites.map((site, index) => (
        <ProceduralArray
          key={`proc-${index}-${site.x.toFixed(1)}`}
          site={site}
          map={map}
          index={index}
          panelRefs={panelRefs}
          onReady={onReady}
        />
      ))}
    </group>
  );
}

export function RooftopInstall({ sites, active, hovered, playId, runtime, map }: RooftopInstallProps) {
  const root = useRef<THREE.Group>(null);
  const sequence = useRef<gsap.core.Timeline | null>(null);
  const panels = useRef<Array<THREE.Group | null>>([]);
  const [mounted, setMounted] = useState(0);
  const onReady = useCallback(() => setMounted((value) => value + 1), []);
  const light = useRef<THREE.PointLight>(null);
  const reveal = useRef<EnergyReveal>({ v: 0 });
  const charges = useRef(sites.map(() => ({ v: 0 })));
  const focus = useMemo(() => rooftopFocusSite() ?? sites[0], [sites]);
  const feed = useMemo(() => (focus ? rooftopFeed(focus) : null), [focus]);
  const rail = useMemo(() => createRailMaterial(), []);
  const gridFace = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#9aa3a8",
        emissive: "#d7e7ea",
        emissiveIntensity: 0,
        metalness: 0.25,
        roughness: 0.48,
      }),
    [],
  );
  const inverter = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8b9298",
        emissive: "#ffc48a",
        emissiveIntensity: 0,
        metalness: 0.2,
        roughness: 0.55,
      }),
    [],
  );
  const windows = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffc89a",
        transparent: true,
        opacity: 0,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );
  const spill = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffbf86",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    charges.current = sites.map(() => ({ v: 0 }));
    panels.current = [];
  }, [sites]);

  useEffect(
    () => () => {
      rail.dispose();
      gridFace.dispose();
      inverter.dispose();
      windows.dispose();
      spill.dispose();
    },
    [gridFace, inverter, rail, spill, windows],
  );

  useGSAP(() => {
    const ready = panels.current.filter(Boolean).length;
    if (ready < Math.min(sites.length, 1)) return;
    const timeline = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
    panels.current.forEach((panel, index) => {
      if (!panel) return;
      const restY = panel.userData.restY ?? panel.position.y;
      const restRotX = panel.userData.restRotX ?? 0.12;
      const at = 0.18 + (index % 14) * 0.07 + Math.floor(index / 14) * 0.1;
      timeline.to(panel.position, { y: restY, duration: 0.85, ease: "power3.out" }, at);
      timeline.to(panel.rotation, { x: restRotX, duration: 0.85, ease: "power3.out" }, at);
      timeline.to(charges.current[index], { v: 0.62, duration: 0.4, ease: "power1.inOut" }, at + 0.55);
    });
    sequence.current = timeline;
    steerTimeline(timeline, active, hovered, runtime.current?.reduceMotion ?? false);
    return () => {
      timeline.kill();
      sequence.current = null;
    };
  }, { dependencies: [playId, sites.length, mounted, active, hovered] });

  useEffect(() => {
    steerTimeline(sequence.current, active, hovered, runtime.current?.reduceMotion ?? false);
  }, [active, hovered, playId, runtime]);

  useFrame(() => {
    if (root.current) {
      const progress = sequence.current?.progress() ?? 0;
      root.current.visible = active || hovered || progress > 0.01;
    }
    if (!feed) return;
    const house = reached(reveal.current.v, feed.house);
    const grid = reached(reveal.current.v, feed.grid);
    const night = 1 - (runtime.current?.day ?? 1);
    const generation = runtime.current?.generation ?? 1;
    panels.current.forEach((panel, index) => {
      if (!panel) return;
      panel.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const mat = child.material;
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        const name = `${child.name} ${mat.name}`.toLowerCase();
        if (name.includes("cell") || name.includes("glass") || name.includes("pv") || name.includes("panel")) {
          mat.emissiveIntensity = (charges.current[index]?.v ?? 0) * generation;
        }
      });
    });
    windows.opacity = house * (0.05 + night * 0.46);
    spill.opacity = house * (0.02 + night * 0.2);
    inverter.emissiveIntensity = house * 0.7;
    gridFace.emissiveIntensity = grid * 0.65;
    if (light.current) light.current.intensity = house * (0.12 + night * 0.6);
  });

  const HOUSE_W = 6.55;
  const HOUSE_D = 7.25;
  const facadeZ = focus ? focus.z + HOUSE_D / 2 + 0.045 : 0;
  const windowY = [1.7, 4.75, 7.8];
  const proceduralFallback = (
    <ProceduralField sites={sites} map={map} panelRefs={panels} onReady={onReady} />
  );

  return (
    <group ref={root} visible={false}>
      <ModelBoundary fallback={proceduralFallback}>
        <Suspense fallback={null}>
          <GlbRooftopField sites={sites} panelRefs={panels} onReady={onReady} />
        </Suspense>
      </ModelBoundary>

      {focus ? (
        <>
          {windowY.map((y) => (
            <group key={y}>
              {[-1.15, 1.15].map((offset) => (
                <group key={offset} position={[focus.x + offset, y, facadeZ]}>
                  <mesh material={spill} raycast={ignoreInstallRaycast}>
                    <planeGeometry args={[1.15, 1.45]} />
                  </mesh>
                  <mesh material={windows} position={[0, 0, 0.01]} raycast={ignoreInstallRaycast}>
                    <planeGeometry args={[0.62, 0.92]} />
                  </mesh>
                </group>
              ))}
              <group position={[focus.x - HOUSE_W / 2 - 0.05, y, focus.z]}>
                <mesh material={spill} rotation={[0, -Math.PI / 2, 0]} raycast={ignoreInstallRaycast}>
                  <planeGeometry args={[1.15, 1.45]} />
                </mesh>
                <mesh material={windows} position={[-0.01, 0, 0]} rotation={[0, -Math.PI / 2, 0]} raycast={ignoreInstallRaycast}>
                  <planeGeometry args={[0.62, 0.92]} />
                </mesh>
              </group>
            </group>
          ))}
          {feed ? (
            <>
              <EnergyPath points={feed.points} reveal={reveal} active={active} playId={playId} delay={2.35} runtime={runtime} />
              <mesh position={[feed.cabinet.x, 0.32, feed.cabinet.z]} material={rail} raycast={ignoreInstallRaycast}>
                <boxGeometry args={[0.42, 0.64, 0.28]} />
              </mesh>
              <mesh position={[feed.cabinet.x, 0.4, feed.cabinet.z + 0.15]} material={gridFace} raycast={ignoreInstallRaycast}>
                <boxGeometry args={[0.16, 0.2, 0.02]} />
              </mesh>
              <mesh position={[focus.x + 1.05, 0.78, facadeZ + 0.02]} material={rail} raycast={ignoreInstallRaycast}>
                <boxGeometry args={[0.34, 0.48, 0.12]} />
              </mesh>
              <mesh position={[focus.x + 1.05, 0.82, facadeZ + 0.08]} material={inverter} raycast={ignoreInstallRaycast}>
                <boxGeometry args={[0.16, 0.18, 0.02]} />
              </mesh>
              <pointLight ref={light} position={[focus.x, 4.6, facadeZ + 0.7]} color="#ffc48a" distance={6.5} decay={2} intensity={0} />
            </>
          ) : null}
        </>
      ) : null}
    </group>
  );
}
