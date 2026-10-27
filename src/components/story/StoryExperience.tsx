"use client";

import { StoryCanvas } from "@/scene/StoryCanvas";
import type { InstallationActivity, InstallationId, InstallationPlays, MarkerPointerGuard } from "@/scene/installations";
import { detectRenderQuality, qualityHints, type PerformanceHints } from "@/scene/performance";
import type { StoryRuntime } from "@/scene/runtime";
import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

class StoryBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <div className="absolute inset-0 bg-[#d5e4f2]" role="alert" />;
    }
    return this.props.children;
  }
}

function StageFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#d5e4f2]" aria-busy="true">
      <div className="h-9 w-9 animate-pulse rounded-full border-2 border-[#7a93a8]/border-t-[#2f4a5c]" />
    </div>
  );
}

function SceneLoading({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#d5e4f2]/70"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#9bb0c2] border-t-[#2f4a5c]" />
        <p className="text-sm tracking-wide text-[#3d5568]">Loading city…</p>
      </div>
    </div>
  );
}

export function StoryExperience() {
  const stage = useRef<HTMLElement>(null);
  const runtime = useRef<StoryRuntime>({
    progress: 0,
    reduceMotion: false,
    day: 1,
    sun: 1.35,
    lamp: 0,
    windowGlow: 0.08,
    generation: 1,
    lookAt: new THREE.Vector3(2, 4.5, -2),
    sunDirection: new THREE.Vector3(0.48, 0.75, 0.34).normalize(),
  });
  const [inView, setInView] = useState(true);
  const [hints, setHints] = useState<PerformanceHints>(() => qualityHints("high"));
  const [sceneReady, setSceneReady] = useState(false);
  const degraded = useRef(false);
  const [active, setActive] = useState<InstallationActivity>({
    rooftop: false,
    streetlight: false,
    floating: false,
  });
  const [hovered, setHovered] = useState<InstallationId | null>(null);
  const [play, setPlay] = useState<InstallationPlays>({
    rooftop: 0,
    streetlight: 0,
    floating: 0,
  });
  const pointer = useRef<MarkerPointerGuard>({ overMarker: false, owner: null, dragging: false });
  const activate = useCallback((id: InstallationId) => {
    setActive((current) => (current[id] ? current : { ...current, [id]: true }));
    setPlay((current) => ({ ...current, [id]: current[id] + 1 }));
  }, []);
  const hover = useCallback((id: InstallationId | null) => {
    setHovered(id);
  }, []);
  const onReady = useCallback(() => setSceneReady(true), []);
  const onDegrade = useCallback(() => {
    if (degraded.current) return;
    degraded.current = true;
    setHints(qualityHints("low"));
  }, []);

  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { rootMargin: "240px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      runtime.current.reduceMotion = reduce.matches;
      if (degraded.current) {
        setHints(qualityHints("low"));
        return;
      }
      setHints(qualityHints(detectRenderQuality()));
    };
    sync();
    reduce.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      reduce.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <section
      ref={stage}
      id="rooftop"
      aria-label="City"
      className="relative h-svh w-full overflow-hidden bg-[#d5e4f2]"
    >
      <div id="streetlight" className="absolute top-0 left-0 h-px w-px" />
      <div id="floating-solar" className="absolute top-0 left-0 h-px w-px" />
      <SceneLoading visible={!sceneReady} />
      <StoryBoundary>
        <Suspense fallback={<StageFallback />}>
          <StoryCanvas
            runtime={runtime}
            hints={hints}
            frameloop={inView ? "always" : "never"}
            installations={{ active, play, hovered, activate, hover, pointer }}
            onReady={onReady}
            onDegrade={onDegrade}
          />
        </Suspense>
      </StoryBoundary>
    </section>
  );
}
