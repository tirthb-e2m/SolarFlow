import type { WeatherContext } from "@/lib/solar/types";

export const OPEN_METEO_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export function buildWeatherUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: "temperature_2m,cloud_cover,weather_code",
    timezone: "auto",
  });
  return `${OPEN_METEO_ENDPOINT}?${params.toString()}`;
}

export function weatherSummary(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1 || code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Current conditions";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseWeather(body: unknown): WeatherContext | null {
  if (!isRecord(body) || !isRecord(body.current)) return null;
  const temperatureC = numberValue(body.current.temperature_2m);
  const cloudCoverPercent = numberValue(body.current.cloud_cover);
  const weatherCode = numberValue(body.current.weather_code);
  if (temperatureC === null || cloudCoverPercent === null || weatherCode === null) return null;
  return {
    temperatureC,
    cloudCoverPercent,
    weatherCode,
    summary: weatherSummary(weatherCode),
    observedAt: typeof body.current.time === "string" ? body.current.time : "",
    timezone: typeof body.timezone === "string" ? body.timezone : "",
  };
}
