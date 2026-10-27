"use client";

/* Destination materials brighten as each feeder arrives. */
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
import { flowDuration, reached } from "@/scene/installations/energy/flow";
import { floatingNetwork } from "@/scene/installations/energy/routes";
import { createCellMaterial, createFrameMaterial, createRailMaterial } from "@/scene/installations/materials";
import { cloneSolarInstance, measureSolarModel } from "@/scene/installations/SolarModel";
import { ignoreInstallRaycast, steerTimeline } from "@/scene/installations/timeline";
import type { InstallationSite, InstallationSpec } from "@/scene/installations/types";
import type { StoryRuntime } from "@/scene/runtime";

const REST_Y = 0.1;

type FloatingInstallProps = {
  spec: InstallationSpec;
  active: boolean;
  hovered: boolean;
  playId: number;
  runtime: RefObject<StoryRuntime | null>;
  map: THREE.Texture;
  halo: THREE.Texture;
};

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

function ProceduralModule({
  site,
  index,
  map,
  hullRefs,
  onReady,
  panelRefs,
  bobRefs,
  cells,
  frame,
  rail,
  pontoon,
  deck,
  contact,
}: {
  site: InstallationSite;
  index: number;
  map: THREE.Texture;
  hullRefs: MutableRefObject<Array<THREE.Group | null>>;
  onReady: () => void;
  panelRefs: MutableRefObject<Array<THREE.Group | null>>;
  bobRefs: MutableRefObject<Array<THREE.Group | null>>;
  cells: THREE.MeshStandardMaterial[];
  frame: THREE.MeshStandardMaterial;
  rail: THREE.MeshStandardMaterial;
  pontoon: THREE.MeshStandardMaterial;
  deck: THREE.MeshStandardMaterial;
  contact: THREE.MeshBasicMaterial;
}) {
  void map;
  return (
    <group
      ref={(node) => {
        hullRefs.current[index] = node;
        if (node && node.userData.posed !== true) {
          node.position.set(site.x, REST_Y - 0.34, site.z);
          node.rotation.y = site.yaw;
          node.userData.posed = true;
          node.userData.restY = REST_Y;
          onReady();
        }
      }}
    >
      <group
        ref={(node) => {
          bobRefs.current[index] = node;
        }}
      >
        {[-0.34, 0.34].map((z) => (
          <mesh key={z} material={pontoon} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]} raycast={ignoreInstallRaycast}>
            <cylinderGeometry args={[0.12, 0.12, Math.min(1.8, site.w * 0.7), 12]} />
          </mesh>
        ))}
        <mesh material={deck} position={[0, 0.12, 0]} raycast={ignoreInstallRaycast}>
          <boxGeometry args={[site.w * 0.85, 0.06, site.d * 0.55]} />
        </mesh>
        <group
          ref={(node) => {
            panelRefs.current[index] = node;
            if (node && node.userData.posed !== true) {
              node.position.y = 0.55;
              node.rotation.x = 1.05;
              node.userData.posed = true;
              node.userData.restY = 0.34;
              node.userData.restRotX = 0.46;
            }
          }}
        >
          <mesh material={frame} raycast={ignoreInstallRaycast}>
            <boxGeometry args={[site.w * 0.78, 0.035, site.d * 0.42]} />
          </mesh>
          <mesh material={cells[index]} position={[0, 0.025, 0]} raycast={ignoreInstallRaycast}>
            <boxGeometry args={[site.w * 0.7, 0.012, site.d * 0.34]} />
          </mesh>
        </group>
        <mesh material={contact} position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={ignoreInstallRaycast}>
          <planeGeometry args={[site.w * 1.05, site.d * 0.9]} />
        </mesh>
        <mesh material={rail} position={[0, 0.16, 0]} raycast={ignoreInstallRaycast}>
          <boxGeometry args={[site.w * 0.72, 0.04, 0.08]} />
        </mesh>
      </group>
    </group>
  );
}

function tuneFloatClone(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const tuned = materials.map((material) => {
      const mat =
        material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial
          ? material.clone()
          : new THREE.MeshStandardMaterial({ color: "#1a2834" });
      const name = `${child.name} ${mat.name}`.toLowerCase();
      if (name.includes("cell") || name.includes("glass") || name.includes("pv") || name.includes("panel")) {
        mat.color = new THREE.Color("#15202c");
        mat.roughness = 0.24;
        mat.metalness = 0.32;
        mat.emissive = new THREE.Color("#7ea8ba");
        mat.emissiveIntensity = 0;
      } else if (name.includes("pontoon") || name.includes("float")) {
        mat.color = new THREE.Color("#d5dee3");
        mat.roughness = 0.55;
        mat.metalness = 0.18;
      } else if (name.includes("frame") || name.includes("aluminum") || name.includes("rail")) {
        mat.color = new THREE.Color("#c5ced4");
        mat.roughness = 0.4;
        mat.metalness = 0.65;
      }
      mat.needsUpdate = true;
      return mat;
    });
    child.material = Array.isArray(child.material) ? tuned : tuned[0];
  });
}

function GlbFloatUnit({
  site,
  index,
  template,
  hullRefs,
  onReady,
  bobRefs,
}: {
  site: InstallationSite;
  index: number;
  template: THREE.Object3D;
  hullRefs: MutableRefObject<Array<THREE.Group | null>>;
  onReady: () => void;
  bobRefs: MutableRefObject<Array<THREE.Group | null>>;
}) {
  const scene = useMemo(() => {
    const clone = cloneSolarInstance(template);
    tuneFloatClone(clone);
    return clone;
  }, [template]);
  const fit = useMemo(
    () => measureSolarModel(template, "floatingSolarArray", site.w, site.d, 0.92),
    [site.d, site.w, template],
  );
  return (
    <group
      ref={(node) => {
        hullRefs.current[index] = node;
        if (node && node.userData.posed !== true) {
          node.position.set(site.x, REST_Y - 0.4, site.z);
          node.rotation.y = site.yaw;
          node.userData.posed = true;
          node.userData.restY = REST_Y;
          onReady();
        }
      }}
    >
      <group
        ref={(node) => {
          bobRefs.current[index] = node;
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
    </group>
  );
}

function GlbFloatField({
  sites,
  hullRefs,
  onReady,
  bobRefs,
}: {
  sites: InstallationSite[];
  hullRefs: MutableRefObject<Array<THREE.Group | null>>;
  onReady: () => void;
  bobRefs: MutableRefObject<Array<THREE.Group | null>>;
}) {
  const gltf = useLoader(GLTFLoader, MODEL_URLS[MODEL_INDEX.floatingSolarArray]);
  return (
    <group>
      {sites.map((site, index) => (
        <GlbFloatUnit
          key={`float-${index}-${site.x.toFixed(1)}-${site.z.toFixed(1)}`}
          site={site}
          index={index}
          template={gltf.scene}
          hullRefs={hullRefs}
          onReady={onReady}
          bobRefs={bobRefs}
        />
      ))}
    </group>
  );
}

export function FloatingInstall({ spec, active, hovered, playId, runtime, map, halo }: FloatingInstallProps) {
  const hulls = useRef<Array<THREE.Group | null>>([]);
  const root = useRef<THREE.Group>(null);
  const sequence = useRef<gsap.core.Timeline | null>(null);
  const panels = useRef<Array<THREE.Group | null>>([]);
  const bob = useRef<Array<THREE.Group | null>>([]);
  const [mounted, setMounted] = useState(0);
  const onReady = useCallback(() => setMounted((value) => value + 1), []);
  const charges = useRef(spec.sites.map(() => ({ v: 0 })));
  const feedReveal = useRef<EnergyReveal>({ v: 0 });
  const yardReveal = useRef<EnergyReveal>({ v: 0 });
  const streetReveal = useRef<EnergyReveal>({ v: 0 });
  const frame = useMemo(() => createFrameMaterial("#d5dbe1"), []);
  const rail = useMemo(() => createRailMaterial(), []);
  const pontoon = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d5dee3", metalness: 0.18, roughness: 0.58 }),
    [],
  );
  const deck = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8e9aa1", metalness: 0.22, roughness: 0.62 }),
    [],
  );
  const stationFace = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#9aa3a8",
        emissive: "#d5ebe8",
        emissiveIntensity: 0,
        metalness: 0.3,
        roughness: 0.46,
      }),
    [],
  );
  const terminal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#9aa3a8",
        emissive: "#f0d7b0",
        emissiveIntensity: 0,
        metalness: 0.25,
        roughness: 0.5,
      }),
    [],
  );
  const cells = useMemo(
    () => spec.sites.map(() => createCellMaterial(map, "#7ea8ba")),
    [map, spec.sites],
  );
  const contact = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: halo,
        color: "#0c2c33",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [halo],
  );
  const network = useMemo(() => {
    const east = spec.sites.reduce((best, site) => (site.x > best.x ? site : best), spec.sites[0]);
    return floatingNetwork(new THREE.Vector3(east.x + 0.7, 0.08, east.z));
  }, [spec.sites]);
  const branchDelay = 2.55 + flowDuration(network.feed);
  const windows = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#f3efe4",
        transparent: true,
        opacity: 0,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );
  const streetHeads = useMemo(
    () =>
      network.lamps.map(
        () =>
          new THREE.MeshStandardMaterial({
            color: "#2c261f",
            emissive: "#f4efe6",
            emissiveIntensity: 0,
            roughness: 0.4,
          }),
      ),
    [network.lamps],
  );
  const streetPools = useMemo(
    () =>
      network.lamps.map(
        () =>
          new THREE.MeshBasicMaterial({
            map: halo,
            color: "#f4efe6",
            transparent: true,
            opacity: 0,
            depthWrite: false,
            toneMapped: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: -4,
          }),
      ),
    [halo, network.lamps],
  );

  useEffect(() => {
    charges.current = spec.sites.map(() => ({ v: 0 }));
    hulls.current = [];
    panels.current = [];
    bob.current = [];
  }, [spec.sites]);

  useEffect(
    () => () => {
      frame.dispose();
      rail.dispose();
      pontoon.dispose();
      deck.dispose();
      terminal.dispose();
      stationFace.dispose();
      contact.dispose();
      windows.dispose();
      cells.forEach((material) => material.dispose());
      streetHeads.forEach((material) => material.dispose());
      streetPools.forEach((material) => material.dispose());
    },
    [cells, contact, deck, frame, pontoon, rail, stationFace, streetHeads, streetPools, terminal, windows],
  );

  useGSAP(() => {
    if (hulls.current.filter(Boolean).length < 1) return;
    const timeline = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
    spec.sites.forEach((_, index) => {
      const hull = hulls.current[index];
      const panel = panels.current[index];
      const at = (index % 10) * 0.1 + Math.floor(index / 10) * 0.16;
      if (hull) timeline.to(hull.position, { y: hull.userData.restY ?? REST_Y, duration: 0.95, ease: "power2.out" }, at);
      if (panel) {
        timeline.to(panel.position, { y: panel.userData.restY ?? 0.34, duration: 0.75, ease: "power3.inOut" }, at + 0.4);
        timeline.to(panel.rotation, { x: panel.userData.restRotX ?? 0.46, duration: 0.75, ease: "power3.inOut" }, at + 0.4);
      }
      timeline.to(charges.current[index], { v: 0.58, duration: 0.4, ease: "power1.inOut" }, at + 0.9);
    });
    timeline.to(contact, { opacity: 0.28, duration: 0.6 }, 1.0);
    sequence.current = timeline;
    steerTimeline(timeline, active, hovered, runtime.current?.reduceMotion ?? false);
    return () => {
      timeline.kill();
      sequence.current = null;
    };
  }, { dependencies: [playId, spec.sites.length, mounted, active, hovered] });

  useEffect(() => {
    steerTimeline(sequence.current, active, hovered, runtime.current?.reduceMotion ?? false);
  }, [active, hovered, playId, runtime]);

  useFrame(({ clock }) => {
    if (root.current) {
      const progress = sequence.current?.progress() ?? 0;
      root.current.visible = active || hovered || progress > 0.01;
    }
    const bank = reached(feedReveal.current.v, network.cabinetAt);
    const station = reached(feedReveal.current.v, network.substationAt);
    const building = reached(yardReveal.current.v, network.warehouseAt);
    const night = 1 - (runtime.current?.day ?? 1);
    const generation = runtime.current?.generation ?? 1;
    cells.forEach((cell, index) => {
      cell.emissiveIntensity = charges.current[index].v * generation;
    });
    hulls.current.forEach((hull, index) => {
      if (!hull) return;
      hull.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const mat = child.material;
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        const name = `${child.name} ${mat.name}`.toLowerCase();
        if (name.includes("cell") || name.includes("glass") || name.includes("pv") || name.includes("panel")) {
          mat.emissiveIntensity = (charges.current[index]?.v ?? 0) * generation;
        }
      });
    });
    terminal.emissiveIntensity = bank * 0.55;
    stationFace.emissiveIntensity = station * 0.7;
    windows.opacity = building * (0.05 + night * 0.42);
    network.lamps.forEach((_, index) => {
      const live = reached(streetReveal.current.v, network.lampAt[index] ?? 1);
      const head = streetHeads[index];
      const pool = streetPools[index];
      if (head) head.emissiveIntensity = live * (0.22 + night * 0.9);
      if (pool) pool.opacity = live * 0.2;
    });
    if (runtime.current?.reduceMotion) {
      bob.current.forEach((group) => {
        if (group) group.position.y = 0;
      });
      return;
    }
    const time = clock.elapsedTime;
    bob.current.forEach((group, index) => {
      if (!group) return;
      group.position.y = Math.sin(time * 0.85 + index * 0.65) * 0.018;
    });
  });

  const proceduralFallback = (
    <group>
      {spec.sites.map((site, index) => (
        <ProceduralModule
          key={`proc-float-${index}`}
          site={site}
          index={index}
          map={map}
          hullRefs={hulls}
          onReady={onReady}
          panelRefs={panels}
          bobRefs={bob}
          cells={cells}
          frame={frame}
          rail={rail}
          pontoon={pontoon}
          deck={deck}
          contact={contact}
        />
      ))}
    </group>
  );

  return (
    <group ref={root} visible={false}>
      <ModelBoundary fallback={proceduralFallback}>
        <Suspense fallback={null}>
          <GlbFloatField sites={spec.sites} hullRefs={hulls} onReady={onReady} bobRefs={bob} />
        </Suspense>
      </ModelBoundary>
      <EnergyPath points={network.feed} reveal={feedReveal} active={active} playId={playId} delay={2.55} runtime={runtime} />
      <EnergyPath
        points={network.toWarehouse}
        reveal={yardReveal}
        active={active}
        playId={playId}
        delay={branchDelay}
        runtime={runtime}
      />
      <EnergyPath
        points={network.toStreet}
        reveal={streetReveal}
        active={active}
        playId={playId}
        delay={branchDelay}
        runtime={runtime}
      />
      <mesh position={[network.cabinet.x, 0.28, network.cabinet.z]} material={rail} raycast={ignoreInstallRaycast}>
        <boxGeometry args={[0.48, 0.56, 0.3]} />
      </mesh>
      <mesh position={[network.cabinet.x, 0.34, network.cabinet.z + 0.16]} material={terminal} raycast={ignoreInstallRaycast}>
        <boxGeometry args={[0.16, 0.16, 0.02]} />
      </mesh>
      <group position={[network.substation.x, 0, network.substation.z]}>
        <mesh position={[0, 0.45, 0]} material={rail} raycast={ignoreInstallRaycast}>
          <boxGeometry args={[1.3, 0.9, 0.7]} />
        </mesh>
        <mesh position={[-0.55, 0.7, 0]} material={rail} raycast={ignoreInstallRaycast}>
          <boxGeometry args={[0.42, 1.15, 0.42]} />
        </mesh>
        <mesh position={[0.15, 0.72, 0.36]} material={stationFace} raycast={ignoreInstallRaycast}>
          <boxGeometry args={[0.7, 0.16, 0.04]} />
        </mesh>
      </group>
      {[2.15, 4.35].map((y) =>
        [-2.4, 2.4].map((z) => (
          <mesh
            key={`${y}:${z}`}
            material={windows}
            position={[network.wall.x - 0.06, y, network.wall.z + z]}
            rotation={[0, -Math.PI / 2, 0]}
            raycast={ignoreInstallRaycast}
          >
            <planeGeometry args={[1.15, 0.7]} />
          </mesh>
        )),
      )}
      {network.lamps.map((lamp, index) => (
        <group key={`${lamp.x}:${lamp.z}`}>
          <mesh position={[lamp.x, 4.1, lamp.z - 0.5]} material={streetHeads[index]} raycast={ignoreInstallRaycast}>
            <boxGeometry args={[0.22, 0.05, 0.16]} />
          </mesh>
          <mesh
            material={streetPools[index]}
            position={[lamp.x, 0.2, lamp.z - 1.2]}
            rotation={[-Math.PI / 2, 0, 0]}
            raycast={ignoreInstallRaycast}
          >
            <planeGeometry args={[3.4, 2.4]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
