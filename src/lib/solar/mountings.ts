import type { ScenarioId } from "@/lib/analytics/types";

/**
 * Fixed systems sent to PVGIS PVcalc.
 * Azimuth 0 is south in the PVGIS convention, which suits sites in India.
 * These are system assumptions, not measurements returned by the service.
 */
export const pvgisSystems = {
  rooftop: {
    mountingplace: "building",
    angle: 20,
    aspect: 0,
    summary: "Fixed building-integrated array, 20° tilt, azimuth 0° (south).",
  },
  streetlight: {
    mountingplace: "free",
    angle: 15,
    aspect: 0,
    summary: "Fixed free-standing panel, 15° tilt, azimuth 0° (south).",
  },
  floating: {
    mountingplace: "free",
    angle: 12,
    aspect: 0,
    summary:
      "Fixed free-standing array, 12° tilt, azimuth 0° (south). The illustrative water-cooling gain is not added on top of this estimate.",
  },
} as const satisfies Record<
  ScenarioId,
  { mountingplace: "building" | "free"; angle: number; aspect: number; summary: string }
>;

export const scenarioIds = ["rooftop", "streetlight", "floating"] as const;
