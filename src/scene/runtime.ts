import * as THREE from "three";

export type StoryRuntime = {
  progress: number;
  reduceMotion: boolean;
  /** 1 is full daylight, 0 is night. */
  day: number;
  /** Specular strength for the canal. */
  sun: number;
  /** 0–1 street-lamp strength. */
  lamp: number;
  /** Emissive intensity for window maps. */
  windowGlow: number;
  /** 1 in full sun, 0 after sunset. Installed panels multiply by this. */
  generation: number;
  lookAt: THREE.Vector3;
  sunDirection: THREE.Vector3;
};
