import type { RefObject } from "react";

export const installationIds = ["rooftop", "streetlight", "floating"] as const;

export type InstallationId = (typeof installationIds)[number];

export type InstallationActivity = Record<InstallationId, boolean>;

/** Increments each time that installation is started or replayed. */
export type InstallationPlays = Record<InstallationId, number>;

/** World-space sample used by the ghost preview and, later, the install sequence. */
export type InstallationSite = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  w: number;
  d: number;
};

export type InstallationArea = {
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
};

export type InstallationPoint = {
  x: number;
  y: number;
  z: number;
};

export type InstallationSpec = {
  id: InstallationId;
  color: string;
  /** Badge position. Kept clear of the preview so the icon does not cover it. */
  marker: InstallationPoint;
  /** Surface the pin points at. */
  tip: InstallationPoint;
  area: InstallationArea;
  sites: InstallationSite[];
};

/**
 * Smoothed interaction for one installation.
 * Hover aims emphasis at 1. An active marker holds a lower floor so the
 * selection stays visible after the pointer leaves. `update` must not allocate.
 */
export type InstallationFocus = {
  id: InstallationId;
  hovered: boolean;
  active: boolean;
  emphasis: number;
  day: number;
  reduceMotion: boolean;
  delta: number;
};

/**
 * Optional per-frame driver. The install sequences themselves are GSAP timelines
 * in the rooftop, street, and floating modules. Register a driver here only for
 * extra per-frame work. `update` must not allocate.
 */
export interface InstallationAnimation {
  readonly id: InstallationId;
  update(focus: InstallationFocus): void;
  dispose(): void;
}

export type InstallationAnimationFactory = () => InstallationAnimation;

export type MarkerPointerGuard = {
  overMarker: boolean;
  owner: InstallationId | null;
  /** True while a camera drag is in progress, so a marker click is not fired by accident. */
  dragging: boolean;
};

export type InstallationController = {
  active: InstallationActivity;
  /** Replay count. `0` means the sequence has not run. */
  play: InstallationPlays;
  hovered: InstallationId | null;
  /** First call plays the sequence and leaves it installed. Later calls replay it. */
  activate: (id: InstallationId) => void;
  hover: (id: InstallationId | null) => void;
  pointer: RefObject<MarkerPointerGuard>;
};
