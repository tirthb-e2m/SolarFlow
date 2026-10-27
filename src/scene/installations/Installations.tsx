"use client";

/* Three.js objects are mutable by design; the render loop updates them every frame. */
/* eslint-disable react-hooks/immutability */

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { createInstallationAnimation } from "@/scene/installations/animations";
import { installationSpecs } from "@/scene/installations/anchors";
import { FloatingInstall } from "@/scene/installations/floating/FloatingInstall";
import { RooftopInstall } from "@/scene/installations/rooftop/RooftopInstall";
import { StreetInstall } from "@/scene/installations/street/StreetInstall";
import { approach, emphasisTarget, worldPerPixel } from "@/scene/installations/motion";
import { createGlowTexture, createHaloTexture, createPanelTexture } from "@/scene/installations/textures";
import type { InstallationId, InstallationSpec, MarkerPointerGuard } from "@/scene/installations/types";
import type { StoryRuntime } from "@/scene/runtime";

const muteGray = new THREE.Color("#7f8b99");
const ink = new THREE.Color("#1e2936");
const paper = new THREE.Color("#f7f3ea");
const markerPoint = new THREE.Vector3();

function ignoreRaycast() {
  return undefined;
}

const MARKER_LABELS: Record<InstallationId, string> = {
  rooftop: "Rooftop solar",
  streetlight: "Solar streetlights",
  floating: "Floating solar",
};

function createLabelTexture(label: string, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw a marker label");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(247, 243, 234, 0.96)";
  context.beginPath();
  context.roundRect(8, 28, canvas.width - 16, canvas.height - 56, 68);
  context.fill();
  context.fillStyle = accent;
  context.beginPath();
  context.arc(86, 96, 22, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#1c2836";
  context.font = "600 64px 'Segoe UI', sans-serif";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(label, 124, 100);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function MarkerStem({ spec }: { spec: InstallationSpec }) {
  const layout = useMemo(() => {
    const dx = spec.tip.x - spec.marker.x;
    const dy = spec.tip.y - spec.marker.y;
    const dz = spec.tip.z - spec.marker.z;
    const length = Math.max(0.2, Math.hypot(dx, dy, dz));
    const geometry = new THREE.CylinderGeometry(0.028, 0.028, length, 6);
    geometry.translate(0, length / 2, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dx / length, dy / length, dz / length),
    );
    return { geometry, quaternion };
  }, [spec]);

  useEffect(() => () => layout.geometry.dispose(), [layout]);

  return (
    <mesh
      geometry={layout.geometry}
      quaternion={layout.quaternion}
      position={[spec.marker.x, spec.marker.y, spec.marker.z]}
      raycast={ignoreRaycast}
    >
      <meshBasicMaterial color={spec.color} transparent opacity={0.72} toneMapped={false} />
    </mesh>
  );
}

function MarkerGlyph({ id, material }: { id: InstallationId; material: THREE.Material }) {
  if (id === "rooftop") {
    return (
      <group position={[0, 0.01, 0.04]}>
        <mesh material={material} position={[-0.074, 0.05, 0]} rotation={[0, 0, 0.58]} raycast={ignoreRaycast}>
          <boxGeometry args={[0.2, 0.04, 0.02]} />
        </mesh>
        <mesh material={material} position={[0.074, 0.05, 0]} rotation={[0, 0, -0.58]} raycast={ignoreRaycast}>
          <boxGeometry args={[0.2, 0.04, 0.02]} />
        </mesh>
        <mesh material={material} position={[0, -0.05, 0]} raycast={ignoreRaycast}>
          <boxGeometry args={[0.2, 0.052, 0.02]} />
        </mesh>
      </group>
    );
  }
  if (id === "streetlight") {
    return (
      <group position={[0, 0, 0.04]}>
        <mesh material={material} position={[-0.03, -0.02, 0]} raycast={ignoreRaycast}>
          <boxGeometry args={[0.032, 0.26, 0.02]} />
        </mesh>
        <mesh material={material} position={[0.045, 0.092, 0]} raycast={ignoreRaycast}>
          <boxGeometry args={[0.15, 0.026, 0.02]} />
        </mesh>
        <mesh material={material} position={[0.09, 0.048, 0]} raycast={ignoreRaycast}>
          <boxGeometry args={[0.086, 0.038, 0.02]} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[0, 0.02, 0.04]}>
      {[-0.1, 0, 0.1].map((x) => (
        <mesh key={x} material={material} position={[x, 0.02, 0]} raycast={ignoreRaycast}>
          <boxGeometry args={[0.072, 0.048, 0.02]} />
        </mesh>
      ))}
      <mesh material={material} position={[0, -0.05, 0]} raycast={ignoreRaycast}>
        <boxGeometry args={[0.3, 0.016, 0.016]} />
      </mesh>
    </group>
  );
}

type TextureSet = {
  glow: THREE.Texture;
  halo: THREE.Texture;
  panel: THREE.Texture;
  labels: Record<InstallationId, THREE.Texture>;
};

function Marker({
  spec,
  active,
  hovered,
  runtime,
  pointer,
  onHover,
  onActivate,
  glowMap,
  labelMap,
  muted,
}: {
  spec: InstallationSpec;
  active: boolean;
  hovered: boolean;
  muted: boolean;
  runtime: RefObject<StoryRuntime | null>;
  pointer: RefObject<MarkerPointerGuard>;
  onHover: (id: InstallationId | null) => void;
  onActivate: (id: InstallationId) => void;
  glowMap: THREE.Texture;
  labelMap: THREE.Texture;
}) {
  const badge = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const discMat = useRef<THREE.MeshBasicMaterial>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const pulseMat = useRef<THREE.MeshBasicMaterial>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const pulseClock = useRef(0);
  const hoverMix = useRef(0);
  const activeMix = useRef(0);
  const muteMix = useRef(0);
  const accent = useMemo(() => new THREE.Color(spec.color), [spec.color]);
  const icon = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#1e2936", toneMapped: false, fog: false, depthTest: false }),
    [],
  );
  const { gl, camera, size } = useThree();

  useEffect(() => () => icon.dispose(), [icon]);

  useFrame((_, delta) => {
    const reduce = runtime.current?.reduceMotion ?? false;
    hoverMix.current = approach(hoverMix.current, hovered ? 1 : 0, delta, reduce);
    activeMix.current = approach(activeMix.current, active ? 1 : 0, delta, reduce);
    const mute = approach(muteMix.current, muted ? 1 : 0, delta, reduce);
    muteMix.current = mute;
    const hoverAmount = hoverMix.current;
    const activeAmount = activeMix.current;
    const badgeGroup = badge.current;
    if (!badgeGroup || !(camera instanceof THREE.PerspectiveCamera)) return;
    badgeGroup.quaternion.copy(camera.quaternion);
    const distance = camera.position.distanceTo(badgeGroup.getWorldPosition(markerPoint));
    const meters = worldPerPixel(camera, distance, size.height);
    const pixels = size.height < 760 ? 48 : 56;
    badgeGroup.scale.setScalar(meters * pixels * (1 + hoverAmount * 0.08));
    if (!reduce) pulseClock.current += delta;
    const wave = reduce ? 0 : (pulseClock.current % 2.2) / 2.2;
    if (pulse.current) pulse.current.scale.setScalar(1 + wave * 0.7);
    if (pulseMat.current) pulseMat.current.opacity = (1 - wave) * (0.42 + hoverAmount * 0.28);
    discMat.current?.color.copy(paper).lerp(accent, activeAmount * 0.85).lerp(muteGray, mute * 0.2);
    icon.color.copy(ink).lerp(paper, activeAmount * 0.85);
    if (ringMat.current) {
      ringMat.current.color.copy(accent);
      ringMat.current.opacity = 0.9;
    }
    if (glowMat.current) glowMat.current.opacity = 0.2 + hoverAmount * 0.35 + activeAmount * 0.15;
  });

  const claim = (event: ThreeEvent<PointerEvent>) => {
    if (pointer.current.dragging) return;
    event.stopPropagation();
    pointer.current.overMarker = true;
    pointer.current.owner = spec.id;
    gl.domElement.style.cursor = "pointer";
    onHover(spec.id);
  };

  return (
    <group ref={badge} position={[spec.marker.x, spec.marker.y, spec.marker.z]} renderOrder={12}>
      <mesh position={[0, 0, -0.04]} raycast={ignoreRaycast} renderOrder={12} frustumCulled={false}>
        <circleGeometry args={[0.72, 28]} />
        <meshBasicMaterial
          ref={glowMat}
          map={glowMap}
          color={spec.color}
          transparent
          opacity={0.22}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <mesh raycast={ignoreRaycast} renderOrder={13} frustumCulled={false}>
        <circleGeometry args={[0.46, 32]} />
        <meshBasicMaterial ref={discMat} color="#f7f3ea" toneMapped={false} fog={false} depthTest={false} />
      </mesh>
      <mesh ref={pulse} raycast={ignoreRaycast} renderOrder={13} frustumCulled={false}>
        <ringGeometry args={[0.62, 0.7, 40]} />
        <meshBasicMaterial
          ref={pulseMat}
          color={spec.color}
          transparent
          opacity={0.4}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
          fog={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.02]} raycast={ignoreRaycast} renderOrder={14} frustumCulled={false}>
        <ringGeometry args={[0.52, 0.64, 40]} />
        <meshBasicMaterial
          ref={ringMat}
          color={spec.color}
          transparent
          opacity={0.9}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
          fog={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <MarkerGlyph id={spec.id} material={icon} />
      <mesh position={[0, 0.92, 0.06]} raycast={ignoreRaycast} renderOrder={16} frustumCulled={false}>
        <planeGeometry args={[2.55, 0.64]} />
        <meshBasicMaterial map={labelMap} transparent depthTest={false} depthWrite={false} toneMapped={false} fog={false} />
      </mesh>
      <mesh
        position={[0, 0.42, 0.08]}
        renderOrder={15}
        frustumCulled={false}
        onPointerOver={claim}
        onPointerDown={claim}
        onPointerOut={() => {
          const id = spec.id;
          queueMicrotask(() => {
            if (pointer.current.owner !== id) return;
            pointer.current.owner = null;
            pointer.current.overMarker = false;
            gl.domElement.style.cursor = "grab";
            onHover(null);
          });
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (pointer.current.dragging) return;
          onActivate(spec.id);
        }}
      >
        <planeGeometry args={[2.7, 2.15]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}

function Installation({
  spec,
  active,
  hovered,
  runtime,
  pointer,
  playId,
  onHover,
  onActivate,
  textures,
  muted,
}: {
  spec: InstallationSpec;
  active: boolean;
  playId: number;
  hovered: boolean;
  muted: boolean;
  runtime: RefObject<StoryRuntime | null>;
  pointer: RefObject<MarkerPointerGuard>;
  onHover: (id: InstallationId | null) => void;
  onActivate: (id: InstallationId) => void;
  textures: TextureSet;
}) {
  const halo = useRef<THREE.Mesh>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);
  const emphasis = useRef(0);
  const animation = useMemo(() => createInstallationAnimation(spec.id), [spec.id]);
  const outlineMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0,
        toneMapped: false,
        depthWrite: false,
      }),
    [spec.color],
  );

  useEffect(
    () => () => {
      animation.dispose();
      outlineMat.dispose();
    },
    [animation, outlineMat],
  );

  useFrame((_, delta) => {
    const reduce = runtime.current?.reduceMotion ?? false;
    const day = runtime.current?.day ?? 1;
    const target = emphasisTarget(hovered, active);
    emphasis.current = approach(emphasis.current, target, delta, reduce);
    const amount = emphasis.current;
    if (halo.current) halo.current.visible = amount > 0.02;
    if (haloMat.current) haloMat.current.opacity = amount * (0.22 + (1 - day) * 0.1);
    outlineMat.opacity = amount * 0.58;
    animation.update({
      id: spec.id,
      hovered,
      active,
      emphasis: amount,
      day,
      reduceMotion: reduce,
      delta,
    });
  });

  const edges = [
    [0, spec.area.d / 2, spec.area.w, 0.08],
    [0, -spec.area.d / 2, spec.area.w, 0.08],
    [spec.area.w / 2, 0, 0.08, spec.area.d],
    [-spec.area.w / 2, 0, 0.08, spec.area.d],
  ] as const;

  return (
    <group>
      <mesh
        ref={halo}
        position={[spec.area.x, spec.area.y, spec.area.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
        raycast={ignoreRaycast}
        visible={false}
      >
        <planeGeometry args={[spec.area.w, spec.area.d]} />
        <meshBasicMaterial
          ref={haloMat}
          map={textures.halo}
          color={spec.color}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
        />
      </mesh>
      <group>
        {edges.map(([x, z, w, d]) => (
          <mesh
            key={`${x}:${z}`}
            position={[spec.area.x + x, spec.area.y + 0.28, spec.area.z + z]}
            material={outlineMat}
            raycast={ignoreRaycast}
          >
            <boxGeometry args={[w, 0.05, d]} />
          </mesh>
        ))}
      </group>
      <Marker
        spec={spec}
        active={active}
        hovered={hovered}
        runtime={runtime}
        pointer={pointer}
        onHover={onHover}
        onActivate={onActivate}
        glowMap={textures.glow}
        labelMap={textures.labels[spec.id]}
        muted={muted}
      />
      <MarkerStem spec={spec} />
      {spec.id === "rooftop" && spec.sites.length > 0 ? (
        <RooftopInstall
          sites={spec.sites}
          active={active}
          hovered={hovered}
          playId={playId}
          runtime={runtime}
          map={textures.panel}
        />
      ) : null}
      {spec.id === "streetlight" ? (
        <StreetInstall
          spec={spec}
          active={active}
          hovered={hovered}
          playId={playId}
          runtime={runtime}
          map={textures.panel}
          halo={textures.halo}
        />
      ) : null}
      {spec.id === "floating" ? (
        <FloatingInstall
          spec={spec}
          active={active}
          hovered={hovered}
          playId={playId}
          runtime={runtime}
          map={textures.panel}
          halo={textures.halo}
        />
      ) : null}
    </group>
  );
}

type InstallationsProps = {
  runtime: RefObject<StoryRuntime | null>;
  active: Record<InstallationId, boolean>;
  play: Record<InstallationId, number>;
  hovered: InstallationId | null;
  onHover: (id: InstallationId | null) => void;
  onActivate: (id: InstallationId) => void;
  pointer: RefObject<MarkerPointerGuard>;
};

export function Installations({ runtime, active, play, hovered, onHover, onActivate, pointer }: InstallationsProps) {
  const textures = useMemo(
    () => ({
      glow: createGlowTexture(),
      halo: createHaloTexture(),
      panel: createPanelTexture(),
      labels: {
        rooftop: createLabelTexture(MARKER_LABELS.rooftop, "#e36b24"),
        streetlight: createLabelTexture(MARKER_LABELS.streetlight, "#e7a322"),
        floating: createLabelTexture(MARKER_LABELS.floating, "#1aa8b5"),
      },
    }),
    [],
  );

  useEffect(
    () => () => {
      textures.glow.dispose();
      textures.halo.dispose();
      textures.panel.dispose();
      textures.labels.rooftop.dispose();
      textures.labels.streetlight.dispose();
      textures.labels.floating.dispose();
    },
    [textures],
  );

  return (
    <group>
      {installationSpecs.map((spec) => (
        <Installation
          key={spec.id}
          spec={spec}
          active={active[spec.id]}
          playId={play[spec.id]}
          hovered={hovered === spec.id}
          muted={
            (hovered !== null && hovered !== spec.id) ||
            (hovered === null &&
              (active.rooftop || active.streetlight || active.floating) &&
              !active[spec.id])
          }
          runtime={runtime}
          pointer={pointer}
          onHover={onHover}
          onActivate={onActivate}
          textures={textures}
        />
      ))}
    </group>
  );
}
