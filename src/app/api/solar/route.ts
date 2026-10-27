import { pvgisSystems, scenarioIds } from "@/lib/solar/mountings";
import { buildPvgisUrl, parsePvgisBody } from "@/lib/solar/pvgis";
import type { ScenarioId } from "@/lib/analytics/types";
import type { SolarEstimate, SolarResponse } from "@/lib/solar/types";
import { buildWeatherUrl, parseWeather } from "@/lib/solar/weather";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PVGIS_TIMEOUT_MS = 25_000;
const WEATHER_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const cache = new Map<string, { expires: number; body: SolarEstimate }>();
const inflight = new Map<string, Promise<SolarResponse>>();

function cacheKey(latitude: number, longitude: number, lossPercent: number): string {
  return `${latitude.toFixed(3)}|${longitude.toFixed(3)}|${lossPercent.toFixed(1)}`;
}

function readNumber(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function fetchScenario(
  latitude: number,
  longitude: number,
  lossPercent: number,
  scenarioId: ScenarioId,
): Promise<{ scenarioId: ScenarioId } & ReturnType<typeof parsePvgisBody>> {
  const system = pvgisSystems[scenarioId];
  const url = buildPvgisUrl({
    latitude,
    longitude,
    lossPercent,
    mountingplace: system.mountingplace,
    angle: system.angle,
    aspect: system.aspect,
  });
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(PVGIS_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    const body = await readJson(response);
    if (body === null) {
      return { scenarioId, ok: false, message: "PVGIS returned a response that was not JSON." };
    }
    const parsed = parsePvgisBody(body, scenarioId);
    return { scenarioId, ...parsed };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      scenarioId,
      ok: false,
      message: timedOut ? "PVGIS timed out." : "PVGIS could not be reached.",
    };
  }
}

async function fetchWeather(latitude: number, longitude: number): Promise<SolarEstimate["weather"]> {
  try {
    const response = await fetch(buildWeatherUrl(latitude, longitude), {
      cache: "no-store",
      signal: AbortSignal.timeout(WEATHER_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return parseWeather(await readJson(response));
  } catch {
    return null;
  }
}

async function loadEstimate(
  latitude: number,
  longitude: number,
  lossPercent: number,
): Promise<SolarResponse> {
  const key = cacheKey(latitude, longitude, lossPercent);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.body;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async (): Promise<SolarResponse> => {
    const [parsedScenarios, weather] = await Promise.all([
      Promise.all(
        scenarioIds.map((scenarioId) => fetchScenario(latitude, longitude, lossPercent, scenarioId)),
      ),
      fetchWeather(latitude, longitude),
    ]);

    const scenarios: SolarEstimate["scenarios"] = {};
    const scenarioErrors: SolarEstimate["scenarioErrors"] = {};
    let shared: Extract<(typeof parsedScenarios)[number], { ok: true }> | null = null;
    for (const parsed of parsedScenarios) {
      if (parsed.ok) {
        scenarios[parsed.scenarioId] = parsed.estimate;
        shared ??= parsed;
      } else {
        scenarioErrors[parsed.scenarioId] = parsed.message;
      }
    }

    if (!shared) {
      const message = parsedScenarios.find((parsed) => !parsed.ok)?.message ?? "PVGIS did not return an estimate.";
      return { ok: false, message };
    }

    const body: SolarEstimate = {
      ok: true,
      provider: "PVGIS 5.3",
      latitude,
      longitude,
      lossPercent,
      elevationM: shared.elevationM,
      radiationDatabase: shared.radiationDatabase,
      yearMin: shared.yearMin,
      yearMax: shared.yearMax,
      technology: shared.technology,
      peakPowerKw: 1,
      scenarios,
      scenarioErrors,
      weather,
      weatherNote: weather
        ? null
        : "Current weather was unavailable. It is not used in the energy estimate.",
    };
    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, body });
    if (cache.size > 40) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    return body;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = readNumber(url.searchParams.get("lat"), -90, 90);
  const longitude = readNumber(url.searchParams.get("lon"), -180, 180);
  const lossPercent = readNumber(url.searchParams.get("loss"), 0, 40);
  if (latitude === null || longitude === null || lossPercent === null) {
    return Response.json(
      {
        ok: false,
        message: "Enter a latitude from -90 to 90, a longitude from -180 to 180, and system losses from 0 to 40%.",
      },
      { status: 400 },
    );
  }

  const body = await loadEstimate(latitude, longitude, lossPercent);
  return Response.json(body, { status: body.ok ? 200 : 502 });
}
