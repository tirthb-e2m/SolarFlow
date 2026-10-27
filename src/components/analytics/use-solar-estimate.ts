"use client";

import { defaultLocation, defaultSystemLossPercent } from "@/lib/solar/locations";
import type { SolarEstimate, SolarResponse } from "@/lib/solar/types";
import { useEffect, useState } from "react";

export type SolarStatus = "demo" | "loading" | "ready" | "error";

async function readSolarBody(response: Response): Promise<SolarResponse | null> {
  try {
    const body = (await response.json()) as SolarResponse;
    if (!body || typeof body !== "object" || !("ok" in body)) return null;
    return body;
  } catch {
    return null;
  }
}

export function useSolarEstimate() {
  const [latitude, setLatitude] = useState(defaultLocation.latitude);
  const [longitude, setLongitude] = useState(defaultLocation.longitude);
  const [lossPercent, setLossPercent] = useState(defaultSystemLossPercent);
  const [generation, setGeneration] = useState(0);
  const [status, setStatus] = useState<SolarStatus>("demo");
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<SolarEstimate | null>(null);

  useEffect(() => {
    if (generation === 0) return;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 32_000);
    const timer = window.setTimeout(() => {
      void (async () => {
        setStatus("loading");
        setError(null);
        setEstimate(null);
        try {
          const params = new URLSearchParams({
            lat: String(latitude),
            lon: String(longitude),
            loss: String(lossPercent),
          });
          const response = await fetch(`/api/solar?${params.toString()}`, {
            signal: controller.signal,
          });
          const body = await readSolarBody(response);
          if (controller.signal.aborted) return;
          if (!body) {
            setStatus("error");
            setError(
              response.status === 504 || response.status === 408
                ? "The request timed out."
                : "PVGIS did not return an estimate.",
            );
            return;
          }
          if (!response.ok || !body.ok) {
            setStatus("error");
            setError(!body.ok ? body.message : "PVGIS did not return an estimate.");
            return;
          }
          setEstimate(body);
          setStatus("ready");
        } catch {
          if (controller.signal.aborted && !timedOut) return;
          setStatus("error");
          setError(timedOut ? "The request timed out." : "PVGIS could not be reached.");
        }
      })();
    }, 450);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [generation, latitude, longitude, lossPercent]);

  function markStale(changed: boolean) {
    if (!changed || generation === 0) return;
    setEstimate(null);
    setError(null);
    setStatus("loading");
  }

  return {
    latitude,
    longitude,
    lossPercent,
    status,
    error,
    estimate,
    setLatitude: (value: number) => {
      setLatitude(value);
      markStale(value !== latitude);
    },
    setLongitude: (value: number) => {
      setLongitude(value);
      markStale(value !== longitude);
    },
    setLossPercent: (value: number) => {
      setLossPercent(value);
      markStale(value !== lossPercent);
    },
    request: () => setGeneration((current) => current + 1),
    useDemo: () => {
      setGeneration(0);
      setEstimate(null);
      setError(null);
      setStatus("demo");
    },
  };
}
