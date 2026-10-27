"use client";

/* Instance matrices and lamp materials are updated from the clock, not React state. */
/* eslint-disable react-hooks/immutability */

import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { buildCity } from "@/scene/city/buildCity";
import { CottageHouse } from "@/scene/city/CottageHouse";
import { GlbProp } from "@/scene/city/GlbProp";
import { GptBuilding } from "@/scene/city/GptBuilding";
import { Skyscraper } from "@/scene/city/Skyscraper";
import { Streetscape } from "@/scene/city/Streetscape";
import type { StoryRuntime } from "@/scene/runtime";

const swayDummy = new THREE.Object3D();

type CityProps = {
  runtime: RefObject<StoryRuntime | null>;
  quality: "high" | "low";
  treeSway?: boolean;
};

export function City({ runtime, quality, treeSway = true }: CityProps) {
  const built = useMemo(() => buildCity(quality), [quality]);
  const wind = useRef(0);
  const frame = useRef(0);
  // Gate GLB extras until after first procedural paint; reset by comparing quality.
  const [readyFor, setReadyFor] = useState<"high" | "low" | null>(null);
  const extrasReady = readyFor === quality;

  useEffect(() => {
    return () => built.dispose();
  }, [built]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(
      () => {
        if (!cancelled) setReadyFor(quality);
      },
      quality === "high" ? 16 : 80,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [quality]);

  useFrame((_, delta) => {
    const state = runtime.current;
    if (!state) return;
    const glow = state.windowGlow;
    built.glow.forEach((material) => {
      material.emissiveIntensity = glow;
    });
    const lamp = state.lamp;
    built.lampMaterials.forEach((material) => {
      material.emissiveIntensity = 0.04 + lamp * 8;
    });
    built.lights.forEach((light) => {
      light.intensity = lamp * 720;
    });
    if (built.pools) built.pools.opacity = lamp * 0.62;
    if (state.reduceMotion || built.canopies.length === 0 || !treeSway) return;
    frame.current += 1;
    if (frame.current % 2 !== 0) return;
    wind.current += delta * 2;
    const time = wind.current;
    built.canopies.forEach((canopy) => {
      for (let i = 0; i < canopy.index.length; i += 1) {
        swayDummy.position.set(canopy.x[i], canopy.y[i], canopy.z[i]);
        swayDummy.rotation.set(
          Math.sin(time * 0.85 + i * 0.7) * 0.012,
          canopy.yaw[i] + Math.sin(time * 0.55 + i) * 0.02,
          Math.sin(time * 0.7 + i * 1.3) * 0.01,
        );
        swayDummy.scale.set(canopy.sx[i], canopy.sy[i], canopy.sz[i]);
        swayDummy.updateMatrix();
        canopy.mesh.setMatrixAt(canopy.index[i], swayDummy.matrix);
      }
      canopy.mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      <primitive object={built.object} dispose={null} />
      {extrasReady && quality === "high" ? (
        <Streetscape
          trees={built.trees}
          lamps={built.lamps}
          quality={quality}
          runtime={runtime}
          treeSway={treeSway}
        />
      ) : null}
      {extrasReady
        ? built.props.map((slot, index) => (
            <GlbProp
              key={`${slot.asset}-${index}-${slot.x.toFixed(1)}-${slot.z.toFixed(1)}`}
              slot={slot}
              quality={quality}
            />
          ))
        : null}
      {extrasReady && built.cottage ? (
        <Suspense fallback={null}>
          <CottageHouse slot={built.cottage} quality={quality} />
        </Suspense>
      ) : null}
      {extrasReady && built.gptBuilding ? (
        <Suspense fallback={null}>
          <GptBuilding slot={built.gptBuilding} quality={quality} />
        </Suspense>
      ) : null}
      {extrasReady && built.skyscraper ? (
        <Suspense fallback={null}>
          <Skyscraper slot={built.skyscraper} quality={quality} />
        </Suspense>
      ) : null}
    </group>
  );
}
