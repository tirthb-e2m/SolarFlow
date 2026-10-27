"use client";

/* Three.js objects are mutable by design; the render loop updates them every frame. */
/* eslint-disable react-hooks/immutability */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";
import { placeCityCamera } from "@/scene/frame";
import type { InstallationController } from "@/scene/installations";
import { useCityControls } from "@/scene/useCityControls";
import { DAY_SECONDS, writeGrade, type LightGrade } from "@/scene/lighting";
import { createFpsWatch, type PerformanceHints } from "@/scene/performance";
import type { StoryRuntime } from "@/scene/runtime";
import { World } from "@/scene/World";

type StoryCanvasProps = {
  runtime: RefObject<StoryRuntime | null>;
  hints: PerformanceHints;
  frameloop?: "always" | "demand" | "never";
  installations: InstallationController;
  onReady?: () => void;
  onDegrade?: () => void;
};

const skyVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  varying vec3 vWorld;
  void main() {
    float height = normalize(vWorld).y;
    float grade = smoothstep(-0.05, 0.55, height);
    gl_FragColor = vec4(mix(uHorizon, uTop, grade), 1.0);
  }
`;

function FpsGuard({ onDegrade }: { onDegrade?: () => void }) {
  const watch = useMemo(() => createFpsWatch(26, 2.5), []);
  useFrame((_, delta) => {
    if (!onDegrade) return;
    if (watch.sample(delta)) onDegrade();
  });
  return null;
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    const id = window.requestAnimationFrame(() => onReady?.());
    return () => window.cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

function StoryRig({
  runtime,
  hints,
  installations,
}: {
  runtime: RefObject<StoryRuntime | null>;
  hints: PerformanceHints;
  installations: InstallationController;
}) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const grade = useMemo<LightGrade>(
    () => ({
      day: 1,
      sunIntensity: 2.6,
      sunColor: new THREE.Color("#fff4e4"),
      sunPosition: new THREE.Vector3(52, 78, 36),
      moonIntensity: 0,
      hemiSky: new THREE.Color("#f5f8fc"),
      hemiGround: new THREE.Color("#8ea36e"),
      hemiIntensity: 0.78,
      ambient: 0.28,
      exposure: 1.08,
      fogColor: new THREE.Color("#e7f0f7"),
      fogDensity: 0.0015,
      skyTop: new THREE.Color("#8eb6db"),
      skyHorizon: new THREE.Color("#e5eef6"),
      lamp: 0,
      windowGlow: 0.08,
      generation: 1,
      environment: 0.38,
      sunGlint: 1.35,
    }),
    [],
  );
  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTop: { value: new THREE.Color("#8eb6db") },
          uHorizon: { value: new THREE.Color("#e5eef6") },
        },
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const controls = useCityControls(installations.pointer, installations.hover);
  const clock = useRef(0);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const sunOffset = useMemo(() => new THREE.Vector3(), []);
  const { camera, scene, size, gl } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const map = pmrem.fromScene(room, 0.04);
    scene.environment = map.texture;
    return () => {
      map.dispose();
      pmrem.dispose();
      room.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const list = Array.isArray(child.material) ? child.material : [child.material];
          list.forEach((material) => material.dispose());
        }
      });
      if (scene.environment === map.texture) scene.environment = null;
    };
  }, [gl, scene]);

  useEffect(() => {
    return () => {
      sky.dispose();
    };
  }, [sky]);

  const clearHover = installations.hover;
  const pointerGuard = installations.pointer;
  useEffect(() => {
    const element = gl.domElement;
    element.style.cursor = "grab";
    const leave = () => {
      if (pointerGuard.current.dragging) return;
      pointerGuard.current.overMarker = false;
      pointerGuard.current.owner = null;
      clearHover(null);
      element.style.cursor = "grab";
    };
    element.addEventListener("pointerleave", leave);
    return () => element.removeEventListener("pointerleave", leave);
  }, [gl, clearHover, pointerGuard]);

  useFrame((_, delta) => {
    const state = runtime.current;
    if (!state || !sun.current || !(camera instanceof THREE.PerspectiveCamera)) return;
    const reduce = state.reduceMotion;
    if (!reduce) clock.current += delta;
    const phase = reduce ? 0.4 : ((clock.current / DAY_SECONDS) + 0.4) % 1;
    writeGrade(phase, grade);

    state.day = grade.day;
    state.sun = grade.sunGlint;
    state.lamp = grade.lamp;
    state.windowGlow = grade.windowGlow;
    state.generation = grade.generation;
    controls.tick(delta);
    controls.distance.current = placeCityCamera(
      camera,
      size.width / Math.max(1, size.height),
      controls.azimuth.current,
      controls.polar.current,
      controls.look.current,
      controls.frame.current,
    );
    state.lookAt.copy(controls.look.current);

    sunOffset.copy(grade.sunPosition).normalize();
    sun.current.position.copy(controls.look.current).addScaledVector(sunOffset, 160);
    sun.current.intensity = grade.sunIntensity;
    sun.current.color.copy(grade.sunColor);
    sun.current.target = target;
    target.position.copy(controls.look.current);
    target.updateMatrixWorld();
    state.sunDirection.copy(sun.current.position).sub(target.position).normalize();

    if (hemi.current) {
      hemi.current.color.copy(grade.hemiSky);
      hemi.current.groundColor.copy(grade.hemiGround);
      hemi.current.intensity = grade.hemiIntensity;
    }
    if (ambient.current) ambient.current.intensity = grade.ambient;
    if (fill.current) fill.current.intensity = 0.06 + grade.day * 0.52;
    scene.environmentIntensity = grade.environment;
    gl.toneMappingExposure = grade.exposure;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = grade.fogDensity;
      scene.fog.color.copy(grade.fogColor);
    }
    if (scene.background instanceof THREE.Color) scene.background.copy(grade.fogColor);
    const top = sky.uniforms.uTop.value as THREE.Color;
    const horizon = sky.uniforms.uHorizon.value as THREE.Color;
    top.copy(grade.skyTop);
    horizon.copy(grade.skyHorizon);
  }, -1);

  const mapSize = hints.shadowMap;

  return (
    <>
      <hemisphereLight ref={hemi} args={["#f5f8fc", "#8ea36e", 0.78]} />
      <ambientLight ref={ambient} intensity={0.28} />
      <directionalLight ref={fill} position={[-36, 48, -28]} intensity={0.45} color="#d7e6f4" />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        position={[52, 78, 36]}
        intensity={3.05}
        color="#fff4e4"
        castShadow={hints.shadows}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-camera-near={12}
        shadow-camera-far={280}
        shadow-camera-left={-96}
        shadow-camera-right={96}
        shadow-camera-top={96}
        shadow-camera-bottom={-96}
        shadow-bias={-0.00035}
        shadow-normalBias={0.085}
      />
      <mesh material={sky} frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[1600, hints.quality === "high" ? 28 : 16, hints.quality === "high" ? 16 : 10]} />
      </mesh>
    </>
  );
}

export function StoryCanvas({
  runtime,
  hints,
  frameloop = "always",
  installations,
  onReady,
  onDegrade,
}: StoryCanvasProps) {
  return (
    <Canvas
      key={hints.quality}
      className="absolute inset-0 h-full w-full"
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      frameloop={frameloop}
      shadows={hints.shadows}
      dpr={hints.dpr}
      camera={{ fov: 30, near: 0.5, far: 3200, position: [48, 42, 62] }}
      gl={{
        antialias: hints.antialias,
        alpha: false,
        powerPreference: hints.quality === "high" ? "high-performance" : "default",
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.06;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.shadowMap.enabled = hints.shadows;
        gl.shadowMap.type = hints.quality === "high" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
        gl.domElement.style.touchAction = "none";
      }}
    >
      <color attach="background" args={["#e5eef6"]} />
      <fogExp2 attach="fog" args={["#e7f0f7", 0.0015]} />
      <ReadySignal onReady={onReady} />
      {hints.quality === "high" ? <FpsGuard onDegrade={onDegrade} /> : null}
      <StoryRig runtime={runtime} hints={hints} installations={installations} />
      <World runtime={runtime} hints={hints} installations={installations} />
    </Canvas>
  );
}
