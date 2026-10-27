"use client";

/* The ribbon uniform and the shared reveal value are written every frame. */
/* eslint-disable react-hooks/immutability */

import { useGSAP } from "@gsap/react";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import { energyColor, flowDuration, polylineLength } from "@/scene/installations/energy/flow";
import { createRibbon } from "@/scene/installations/energy/ribbon";
import { ignoreInstallRaycast, settleTimeline } from "@/scene/installations/timeline";
import type { StoryRuntime } from "@/scene/runtime";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uCount;
  uniform vec3 uWarm;
  uniform vec3 uCyan;
  varying vec2 vUv;

  void main() {
    float edge = smoothstep(1.0, 0.2, abs(vUv.y));
    float lit = smoothstep(uReveal + 0.015, uReveal - 0.04, vUv.x);
    float travel = fract(vUv.x * uCount - uTime * 0.42);
    float pulse = smoothstep(0.22, 0.0, abs(travel - 0.08));
    vec3 color = mix(uWarm, uCyan, pulse * 0.55);
    float alpha = lit * edge * (0.16 + pulse * 0.28);
    if (alpha < 0.012) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

export type EnergyReveal = { v: number };

type EnergyPathProps = {
  points: readonly THREE.Vector3[];
  reveal: RefObject<EnergyReveal>;
  active: boolean;
  playId: number;
  delay: number;
  runtime: RefObject<StoryRuntime | null>;
  width?: number;
};

function createEnergyMaterial(length: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uCount: { value: Math.max(2, length / 7) },
      uWarm: { value: new THREE.Color(energyColor.warm) },
      uCyan: { value: new THREE.Color(energyColor.cyan) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
}

export function EnergyPath({ points, reveal, active, playId, delay, runtime, width = 0.4 }: EnergyPathProps) {
  const geometry = useMemo(() => createRibbon(points, width), [points, width]);
  const material = useMemo(() => createEnergyMaterial(polylineLength(points)), [points]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useGSAP(() => {
    if (!active || playId < 1) return;
    reveal.current.v = 0;
    const timeline = gsap.timeline();
    timeline.to(reveal.current, {
      v: 1,
      duration: flowDuration(points),
      delay,
      ease: "none",
    });
    settleTimeline(timeline, runtime.current?.reduceMotion ?? false);
  }, { dependencies: [active, delay, playId, points], revertOnUpdate: true });

  useFrame(({ clock }) => {
    material.uniforms.uReveal.value = reveal.current.v;
    material.uniforms.uTime.value = runtime.current?.reduceMotion ? 0 : clock.elapsedTime;
  });

  if (points.length < 2) return null;

  return (
    <mesh
      geometry={geometry}
      material={material}
      visible={active}
      renderOrder={5}
      raycast={ignoreInstallRaycast}
      frustumCulled={false}
    />
  );
}
