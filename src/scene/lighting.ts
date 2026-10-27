import * as THREE from "three";

export type LightGrade = {
  day: number;
  sunIntensity: number;
  sunColor: THREE.Color;
  sunPosition: THREE.Vector3;
  moonIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  ambient: number;
  exposure: number;
  fogColor: THREE.Color;
  fogDensity: number;
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  lamp: number;
  windowGlow: number;
  environment: number;
  sunGlint: number;
  /** 1 when panels are in full sun, 0 after sunset. */
  generation: number;
};

const dayTop = new THREE.Color("#8eb6db");
const nightTop = new THREE.Color("#1b2940");
const dayHorizon = new THREE.Color("#e7f0f7");
const nightHorizon = new THREE.Color("#3c4e68");
const duskHorizon = new THREE.Color("#f0b48a");
const daySun = new THREE.Color("#fff4e4");
const duskSun = new THREE.Color("#ff9a4a");
const moon = new THREE.Color("#b7c6ea");
const dayHemiSky = new THREE.Color("#f5f8fc");
const nightHemiSky = new THREE.Color("#243044");
const dayHemiGround = new THREE.Color("#8ea36e");
const nightHemiGround = new THREE.Color("#14181e");

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** One sunrise-to-sunrise cycle. */
export const DAY_SECONDS = 15;

const sunDir = new THREE.Vector3();

/** One full turn: noon overhead, sunset in the west, moon through the night, sunrise in the east. */
function sunArc(phase: number) {
  const p = phase - Math.floor(phase);
  const dayEnd = 0.8;
  let sine = 0;
  let azimuth = 0;
  if (p <= dayEnd) {
    const u = p / dayEnd;
    sine = Math.sin(u * Math.PI);
    azimuth = -Math.PI / 2 + u * Math.PI;
  } else {
    const u = (p - dayEnd) / (1 - dayEnd);
    sine = -Math.sin(u * Math.PI);
    azimuth = Math.PI / 2 + u * Math.PI;
  }
  const dayElev = Math.max(sine, 0);
  const nightElev = Math.max(-sine, 0);
  return {
    sine,
    dayElev,
    nightElev,
    pitch: Math.max(dayElev * (Math.PI / 2) + nightElev * 0.62, 0.22),
    azimuth,
  };
}

export function writeGrade(phase: number, out: LightGrade) {
  const { sine, dayElev, pitch, azimuth } = sunArc(phase);
  const day = smoothstep(0, 0.55, dayElev);
  const night = 1 - day;
  const sunAmt = smoothstep(-0.08, 0.45, sine);
  const moonAmt = smoothstep(0.08, -0.45, sine);
  const dusk = sunAmt * (1 - smoothstep(0.22, 0.62, dayElev));
  const drop = smoothstep(0.12, 0.82, night);
  const cp = Math.cos(pitch);
  sunDir.set(Math.sin(azimuth) * cp, Math.sin(pitch), Math.cos(azimuth) * cp);
  out.sunPosition.copy(sunDir);

  out.day = day;
  out.generation = smoothstep(0.08, 0.55, dayElev);
  out.sunIntensity = 2.95 * sunAmt + 0.22 * moonAmt;
  out.sunColor.copy(moon).lerp(daySun, sunAmt);
  out.sunColor.lerp(duskSun, dusk * 0.9);
  out.moonIntensity = 0.45 * moonAmt;
  out.hemiSky.copy(dayHemiSky).lerp(nightHemiSky, night * 0.55);
  out.hemiGround.copy(dayHemiGround).lerp(nightHemiGround, night * 0.45);
  out.hemiIntensity = THREE.MathUtils.lerp(0.74, 0.16, drop);
  out.ambient = THREE.MathUtils.lerp(0.26, 0.04, drop);
  out.exposure = THREE.MathUtils.lerp(1.06, 0.74, drop);
  out.skyTop.copy(dayTop).lerp(nightTop, smoothstep(0.08, 0.9, night));
  out.skyHorizon.copy(dayHorizon).lerp(nightHorizon, smoothstep(0.1, 0.92, night)).lerp(duskHorizon, dusk * 0.55);
  out.fogColor.copy(out.skyHorizon);
  out.fogDensity = THREE.MathUtils.lerp(0.0016, 0.004, night);
  out.lamp = 1 - smoothstep(0.02, 0.38, dayElev);
  out.windowGlow = THREE.MathUtils.lerp(0.06, 2.9, out.lamp);
  out.environment = THREE.MathUtils.lerp(0.62, 0.2, night);
  out.sunGlint = THREE.MathUtils.lerp(0.06, 1.35, sunAmt) * (1 - dusk * 0.2);
  return out;
}
