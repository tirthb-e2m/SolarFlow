import type { ScenarioId } from "@/lib/analytics/types";
import type { PvgisScenarioEstimate } from "@/lib/solar/types";

/** Official PVGIS 5.3 grid-connected PV tool. https://re.jrc.ec.europa.eu/api/v5_3/PVcalc */
export const PVGIS_ENDPOINT = "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc";

export function buildPvgisUrl(input: {
  latitude: number;
  longitude: number;
  lossPercent: number;
  mountingplace: "building" | "free";
  angle: number;
  aspect: number;
}): string {
  const params = new URLSearchParams({
    lat: input.latitude.toFixed(4),
    lon: input.longitude.toFixed(4),
    peakpower: "1",
    loss: String(input.lossPercent),
    mountingplace: input.mountingplace,
    angle: String(input.angle),
    aspect: String(input.aspect),
    fixed: "1",
    pvtechchoice: "crystSi",
    outputformat: "json",
    browser: "0",
  });
  return `${PVGIS_ENDPOINT}?${params.toString()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export type PvgisParse =
  | {
      ok: true;
      estimate: PvgisScenarioEstimate;
      elevationM: number | null;
      radiationDatabase: string;
      yearMin: number | null;
      yearMax: number | null;
      technology: string;
    }
  | { ok: false; message: string };

/**
 * Reads a PVGIS 5.3 PVcalc JSON body.
 * E_y is kWh/year and E_m is kWh/month for the peak power PVGIS calculated.
 * Both are converted to per-kW figures. Financial fields are ignored.
 */
export function parsePvgisBody(body: unknown, scenarioId: ScenarioId): PvgisParse {
  if (!isRecord(body)) return { ok: false, message: "PVGIS returned an empty response." };
  if (!isRecord(body.outputs)) {
    const message = typeof body.message === "string" ? body.message : "PVGIS did not return an energy estimate.";
    return { ok: false, message };
  }

  const outputs = body.outputs;
  const monthlyFixed = isRecord(outputs.monthly) ? outputs.monthly.fixed : null;
  const totalsFixed = isRecord(outputs.totals) ? outputs.totals.fixed : null;
  if (!Array.isArray(monthlyFixed) || !isRecord(totalsFixed)) {
    return { ok: false, message: "PVGIS did not return monthly and annual energy." };
  }

  const inputs = isRecord(body.inputs) ? body.inputs : {};
  const pvModule = isRecord(inputs.pv_module) ? inputs.pv_module : {};
  const peakPowerKw = numberValue(pvModule.peak_power) ?? 1;
  if (peakPowerKw <= 0) return { ok: false, message: "PVGIS returned a peak power of zero." };

  const annual = numberValue(totalsFixed.E_y);
  if (annual === null) return { ok: false, message: "PVGIS did not return annual energy (E_y)." };

  const byMonth = new Map<number, number>();
  for (const row of monthlyFixed) {
    if (!isRecord(row)) continue;
    const month = numberValue(row.month);
    const energy = numberValue(row.E_m);
    if (month === null || energy === null) continue;
    byMonth.set(month, energy);
  }
  if (byMonth.size !== 12) {
    return { ok: false, message: "PVGIS did not return all twelve months." };
  }

  const location = isRecord(inputs.location) ? inputs.location : {};
  const meteo = isRecord(inputs.meteo_data) ? inputs.meteo_data : {};
  const mounting = isRecord(inputs.mounting_system) ? inputs.mounting_system.fixed : null;
  const fixed = isRecord(mounting) ? mounting : {};
  const slope = isRecord(fixed.slope) ? numberValue(fixed.slope.value) : null;
  const azimuth = isRecord(fixed.azimuth) ? numberValue(fixed.azimuth.value) : null;
  const irradiation = numberValue(totalsFixed["H(i)_d"]);
  const totalLoss = numberValue(totalsFixed.l_total);

  return {
    ok: true,
    elevationM: numberValue(location.elevation),
    radiationDatabase:
      typeof meteo.radiation_db === "string" ? meteo.radiation_db : "PVGIS default database",
    yearMin: numberValue(meteo.year_min),
    yearMax: numberValue(meteo.year_max),
    technology: typeof pvModule.technology === "string" ? pvModule.technology : "c-Si",
    estimate: {
      scenarioId,
      specificYieldKwhPerKw: annual / peakPowerKw,
      monthlyKwhPerKw: Array.from({ length: 12 }, (_, index) => (byMonth.get(index + 1) ?? 0) / peakPowerKw),
      slopeDeg: slope ?? 0,
      azimuthDeg: azimuth ?? 0,
      mounting: typeof fixed.type === "string" ? fixed.type : "fixed",
      inPlaneIrradiationKwhPerM2Day: irradiation ?? 0,
      totalLossPercent: totalLoss === null ? 0 : Math.abs(totalLoss),
      systemLossPercent: numberValue(pvModule.system_loss) ?? 0,
    },
  };
}
