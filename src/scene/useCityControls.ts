"use client";

/* The canvas element and camera targets are mutated from pointer events. */
/* eslint-disable react-hooks/immutability */

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { CAMERA_BOUNDS, CAMERA_HOME, CITY_FOCUS, FRAME_HOME } from "@/scene/frame";
import type { InstallationId, MarkerPointerGuard } from "@/scene/installations/types";

function clampLook(target: THREE.Vector3) {
  target.x = THREE.MathUtils.clamp(target.x, CAMERA_BOUNDS.lookMinX, CAMERA_BOUNDS.lookMaxX);
  target.z = THREE.MathUtils.clamp(target.z, CAMERA_BOUNDS.lookMinZ, CAMERA_BOUNDS.lookMaxZ);
  target.y = CITY_FOCUS.y;
}

function clampAzimuth(value: number) {
  return THREE.MathUtils.clamp(
    value,
    CAMERA_HOME.azimuth - CAMERA_BOUNDS.azimuthSpan,
    CAMERA_HOME.azimuth + CAMERA_BOUNDS.azimuthSpan,
  );
}

function clampPolar(value: number) {
  return THREE.MathUtils.clamp(value, CAMERA_BOUNDS.polarMin, CAMERA_BOUNDS.polarMax);
}

function clampFrame(value: number) {
  return THREE.MathUtils.clamp(value, CAMERA_BOUNDS.frameMin, CAMERA_BOUNDS.frameMax);
}

/**
 * Left drag pans, right drag or shift-drag orbits, the wheel and a two-finger pinch zoom.
 * Targets ease toward the gesture so the home composition stays put until the user moves.
 */
export function useCityControls(
  pointer: RefObject<MarkerPointerGuard>,
  clearHover: (id: InstallationId | null) => void,
) {
  const { gl, size } = useThree();
  const azimuth = useRef(CAMERA_HOME.azimuth);
  const polar = useRef(CAMERA_HOME.polar);
  const frame = useRef(FRAME_HOME);
  const look = useRef(CITY_FOCUS.clone());
  const azimuthTarget = useRef(CAMERA_HOME.azimuth);
  const polarTarget = useRef(CAMERA_HOME.polar);
  const frameTarget = useRef(FRAME_HOME);
  const lookTarget = useRef(CITY_FOCUS.clone());
  const distance = useRef(110);
  const viewport = useRef({ width: size.width, height: size.height });

  useEffect(() => {
    viewport.current.width = size.width;
    viewport.current.height = size.height;
  }, [size.width, size.height]);

  useEffect(() => {
    const element = gl.domElement;
    element.style.touchAction = "none";
    element.style.cursor = "grab";
    const pointers = new Map<number, { x: number; y: number }>();
    const gesture = {
      mode: "pan" as "pan" | "orbit",
      moved: false,
      lastX: 0,
      lastY: 0,
      originX: 0,
      originY: 0,
      pinch: null as null | { dist: number; angle: number; x: number; y: number },
    };

    const panBy = (dx: number, dy: number) => {
      const sin = Math.sin(azimuth.current);
      const cos = Math.cos(azimuth.current);
      const meters =
        (2 * Math.tan(THREE.MathUtils.degToRad(28) / 2) * distance.current) /
        Math.max(1, viewport.current.height);
      // Screen-Y is down-positive; flip vertical so drag direction matches map panning.
      lookTarget.current.x -= (dx * cos + dy * sin) * meters;
      lookTarget.current.z -= (dx * -sin + dy * cos) * meters;
      clampLook(lookTarget.current);
    };

    const orbitBy = (dx: number, dy: number) => {
      azimuthTarget.current = clampAzimuth(azimuthTarget.current - dx * 0.0045);
      polarTarget.current = clampPolar(polarTarget.current + dy * 0.0032);
    };

    const zoomBy = (deltaY: number, deltaMode: number) => {
      const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? 48 : 1;
      const notches = THREE.MathUtils.clamp((deltaY * unit) / 120, -1.4, 1.4);
      frameTarget.current = clampFrame(frameTarget.current * (1 + notches * 0.08));
    };

    const beginDrag = () => {
      if (gesture.moved) return;
      gesture.moved = true;
      pointer.current.dragging = true;
      pointer.current.overMarker = false;
      pointer.current.owner = null;
      clearHover(null);
      element.style.cursor = "grabbing";
    };

    const onDown = (event: PointerEvent) => {
      if (event.button > 2) return;
      pointer.current.dragging = false;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      gesture.mode = event.button === 2 || event.shiftKey ? "orbit" : "pan";
      gesture.moved = false;
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
      gesture.originX = event.clientX;
      gesture.originY = event.clientY;
      gesture.pinch = null;
      element.setPointerCapture(event.pointerId);
    };

    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        const pts = [...pointers.values()];
        const a = pts[0];
        const b = pts[1];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const x = (a.x + b.x) / 2;
        const y = (a.y + b.y) / 2;
        if (gesture.pinch) {
          frameTarget.current = clampFrame(frameTarget.current * (gesture.pinch.dist / dist));
          panBy(x - gesture.pinch.x, y - gesture.pinch.y);
          let spin = angle - gesture.pinch.angle;
          if (spin > Math.PI) spin -= Math.PI * 2;
          if (spin < -Math.PI) spin += Math.PI * 2;
          azimuthTarget.current = clampAzimuth(azimuthTarget.current - spin);
          beginDrag();
        }
        gesture.pinch = { dist, angle, x, y };
        gesture.lastX = x;
        gesture.lastY = y;
        return;
      }
      const dx = event.clientX - gesture.lastX;
      const dy = event.clientY - gesture.lastY;
      const travel = Math.hypot(event.clientX - gesture.originX, event.clientY - gesture.originY);
      if (travel > 4) beginDrag();
      if (gesture.moved) {
        if (gesture.mode === "orbit") orbitBy(dx, dy);
        else panBy(dx, dy);
      }
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
    };

    const onUp = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      if (pointers.size > 0) {
        gesture.pinch = null;
        return;
      }
      if (gesture.moved) {
        pointer.current.dragging = true;
        requestAnimationFrame(() => {
          pointer.current.dragging = false;
        });
      } else {
        pointer.current.dragging = false;
      }
      element.style.cursor = "grab";
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomBy(event.deltaY, event.deltaMode);
    };

    const onMenu = (event: Event) => event.preventDefault();

    element.addEventListener("pointerdown", onDown, true);
    element.addEventListener("pointermove", onMove, true);
    element.addEventListener("pointerup", onUp, true);
    element.addEventListener("pointercancel", onUp, true);
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("contextmenu", onMenu);
    return () => {
      element.removeEventListener("pointerdown", onDown, true);
      element.removeEventListener("pointermove", onMove, true);
      element.removeEventListener("pointerup", onUp, true);
      element.removeEventListener("pointercancel", onUp, true);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("contextmenu", onMenu);
    };
  }, [gl, pointer, clearHover]);

  const tick = (delta: number) => {
    const blend = 1 - Math.exp(-Math.max(delta, 0) * 14);
    azimuth.current += (azimuthTarget.current - azimuth.current) * blend;
    polar.current += (polarTarget.current - polar.current) * blend;
    frame.current += (frameTarget.current - frame.current) * blend;
    look.current.lerp(lookTarget.current, blend);
  };

  return { azimuth, polar, frame, look, distance, tick };
}
