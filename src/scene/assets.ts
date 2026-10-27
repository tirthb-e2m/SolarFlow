/**
 * City and installation GLB models. Origins should sit on the ground unless noted.
 * Several authored assets are Z-up and need a -90° X rotation in the loader.
 *
 * Legacy / installation-reserved:
 * - cottage.glb — thatched cottage (3dassets.dev, CC0).
 * - roof-panel.glb — single roof module.
 * - street-lamp.glb — harbour lamp.
 * - pontoon.glb — 8 m marina pontoon.
 * - solar-array.glb — three-module rack.
 * - gpt.glb — review villa with rooftop solar.
 *
 * Phase 1 city assets:
 * - solarflow_optimized_skyscraper.glb — landmark tower (Z-up).
 * - office_midrise / apartment_block / commercial_complex — medium-height fabric.
 * - city_school / city_hospital / public_library — civic landmarks.
 * - tree_* / streetlight_* / bus_shelter / city_transformer — streetscape.
 * - solar_panel_array.glb — rooftop PV rack (Phase 2).
 * - floating_solar_array.glb — floating farm module (Phase 2, Z-up).
 */
export const MODEL_URLS = [
  "/models/cottage.glb",
  "/models/roof-panel.glb",
  "/models/street-lamp.glb",
  "/models/pontoon.glb",
  "/models/solar-array.glb",
  "/models/gpt.glb",
  "/models/solarflow_optimized_skyscraper.glb",
  "/models/office_midrise.glb",
  "/models/apartment_block.glb",
  "/models/commercial_complex.glb",
  "/models/city_school.glb",
  "/models/city_hospital.glb",
  "/models/public_library.glb",
  "/models/tree_broad.glb",
  "/models/tree_evergreen.glb",
  "/models/tree_ornamental.glb",
  "/models/streetlight_modern.glb",
  "/models/streetlight_solar.glb",
  "/models/bus_shelter.glb",
  "/models/city_transformer.glb",
  "/models/solar_panel_array.glb",
  "/models/floating_solar_array.glb",
] as const;

export const MODEL_INDEX = {
  cottage: 0,
  roofPanel: 1,
  streetLamp: 2,
  pontoon: 3,
  solarArray: 4,
  gpt: 5,
  skyscraper: 6,
  officeMidrise: 7,
  apartmentBlock: 8,
  commercialComplex: 9,
  citySchool: 10,
  cityHospital: 11,
  publicLibrary: 12,
  treeBroad: 13,
  treeEvergreen: 14,
  treeOrnamental: 15,
  streetlightModern: 16,
  streetlightSolar: 17,
  busShelter: 18,
  cityTransformer: 19,
  solarPanelArray: 20,
  floatingSolarArray: 21,
} as const;

export type ModelKey = keyof typeof MODEL_INDEX;

/** Authored extents before placement scale. Used when the GLB fails to load. */
export const MODEL_FALLBACK: Record<
  ModelKey,
  { w: number; h: number; d: number; zUp?: boolean }
> = {
  cottage: { w: 8, h: 5, d: 8 },
  roofPanel: { w: 1.2, h: 0.08, d: 0.7 },
  streetLamp: { w: 0.6, h: 4, d: 0.6 },
  pontoon: { w: 8, h: 0.4, d: 1.2 },
  solarArray: { w: 3.2, h: 1.3, d: 1.6 },
  gpt: { w: 7, h: 10, d: 7 },
  skyscraper: { w: 15.5, h: 80.5, d: 12.5, zUp: true },
  officeMidrise: { w: 24.35, h: 17.45, d: 12.21, zUp: true },
  apartmentBlock: { w: 25.8, h: 22.6, d: 16.5, zUp: true },
  commercialComplex: { w: 32.5, h: 12.55, d: 22.86, zUp: true },
  citySchool: { w: 43.3, h: 15.08, d: 25.11, zUp: true },
  cityHospital: { w: 34.66, h: 17.8, d: 19.26, zUp: true },
  publicLibrary: { w: 33, h: 9.32, d: 20.09, zUp: true },
  treeBroad: { w: 7.4, h: 7.2, d: 6.7, zUp: true },
  treeEvergreen: { w: 2.47, h: 7.39, d: 2.45, zUp: true },
  treeOrnamental: { w: 7.3, h: 5.7, d: 2.4, zUp: true },
  streetlightModern: { w: 2.27, h: 5.64, d: 0.44, zUp: true },
  streetlightSolar: { w: 2.92, h: 5.66, d: 1, zUp: true },
  busShelter: { w: 5.05, h: 2.35, d: 2.76 },
  cityTransformer: { w: 4.9, h: 2.45, d: 2.97 },
  solarPanelArray: { w: 4.4, h: 2.13, d: 3.52 },
  floatingSolarArray: { w: 71.85, h: 1.64, d: 49.8, zUp: true },
};
