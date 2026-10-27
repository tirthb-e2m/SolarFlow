import type { ScenarioId } from "@/lib/analytics/types";

export type PvgisScenarioEstimate = {
  scenarioId: ScenarioId;
  /** E_y divided by the requested peak power. Unit: kWh/kW/year. */
  specificYieldKwhPerKw: number;
  /** E_m divided by the requested peak power, January to December. Unit: kWh/kW/month. */
  monthlyKwhPerKw: number[];
  slopeDeg: number;
  azimuthDeg: number;
  mounting: string;
  /** H(i)_d. Unit: kWh/m²/day on the plane of the array. */
  inPlaneIrradiationKwhPerM2Day: number;
  /** Absolute value of PVGIS l_total, in percent. */
  totalLossPercent: number;
  systemLossPercent: number;
};

export type WeatherContext = {
  temperatureC: number;
  cloudCoverPercent: number;
  weatherCode: number;
  summary: string;
  observedAt: string;
  timezone: string;
};

export type SolarEstimate = {
  ok: true;
  provider: "PVGIS 5.3";
  latitude: number;
  longitude: number;
  lossPercent: number;
  elevationM: number | null;
  radiationDatabase: string;
  yearMin: number | null;
  yearMax: number | null;
  technology: string;
  /** Peak power requested from PVGIS, in kW. Yields below are per kW. */
  peakPowerKw: number;
  scenarios: Partial<Record<ScenarioId, PvgisScenarioEstimate>>;
  scenarioErrors: Partial<Record<ScenarioId, string>>;
  weather: WeatherContext | null;
  weatherNote: string | null;
};

export type SolarError = {
  ok: false;
  message: string;
};

export type SolarResponse = SolarEstimate | SolarError;
