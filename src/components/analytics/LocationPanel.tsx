"use client";

import { NumberField } from "@/components/analytics/NumberField";
import type { SolarStatus } from "@/components/analytics/use-solar-estimate";
import { formatNumber } from "@/lib/analytics";
import { cx } from "@/lib/cx";
import {
  defaultSystemLossPercent,
  formatCoordinate,
  locationPresets,
  matchingPreset,
} from "@/lib/solar/locations";
import { pvgisSystems } from "@/lib/solar/mountings";
import type { ScenarioId } from "@/lib/analytics/types";
import type { SolarEstimate } from "@/lib/solar/types";

type LocationPanelProps = {
  latitude: number;
  longitude: number;
  lossPercent: number;
  status: SolarStatus;
  error: string | null;
  estimate: SolarEstimate | null;
  activeScenarioId: ScenarioId;
  onLatitude: (value: number) => void;
  onLongitude: (value: number) => void;
  onLoss: (value: number) => void;
  onPreset: (latitude: number, longitude: number) => void;
  onFetch: () => void;
  onUseDemo: () => void;
};

export function LocationPanel({
  latitude,
  longitude,
  lossPercent,
  status,
  error,
  estimate,
  activeScenarioId,
  onLatitude,
  onLongitude,
  onLoss,
  onPreset,
  onFetch,
  onUseDemo,
}: LocationPanelProps) {
  const preset = matchingPreset(latitude, longitude);
  const active = estimate?.scenarios[activeScenarioId];
  const activeError = estimate?.scenarioErrors[activeScenarioId];
  const place = preset?.name ?? "Custom point";
  const years =
    estimate?.yearMin != null && estimate.yearMax != null
      ? `${estimate.yearMin}–${estimate.yearMax}`
      : "the years PVGIS used";

  return (
    <div className="border border-white/10 px-4 py-5 md:px-6">
      <p className="font-sans text-[0.68rem] font-medium tracking-[0.22em] text-mute uppercase">
        Location
      </p>
      <h3 className="mt-3 font-display text-[1.7rem] leading-none tracking-[-0.03em] text-paper">
        Where the sun is counted
      </h3>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/60">
        The default is New Delhi, {formatCoordinate(locationPresets[0].latitude, locationPresets[0].longitude)}, the same bearing as the story. Fetch asks PVGIS 5.3 for a 1 kW crystalline-silicon system. The dashboard multiplies that yield by your capacity. Prices are not sent.
      </p>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Indian locations">
        {locationPresets.map((item) => {
          const selected = preset?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onPreset(item.latitude, item.longitude)}
              className={cx(
                "min-h-11 border px-3 py-2 font-sans text-[0.68rem] font-medium tracking-[0.14em] uppercase transition-colors duration-300",
                selected
                  ? "border-cyan/80 text-paper"
                  : "border-white/10 text-mute hover:border-white/30 hover:text-paper",
              )}
            >
              {item.name}
            </button>
          );
        })}
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <NumberField
          id="site-latitude"
          label="Latitude"
          unit="decimal °"
          hint="South is negative. PVGIS accepts -90 to 90."
          min={-90}
          max={90}
          step={0.01}
          value={latitude}
          onChange={onLatitude}
        />
        <NumberField
          id="site-longitude"
          label="Longitude"
          unit="decimal °"
          hint="West is negative. PVGIS accepts -180 to 180."
          min={-180}
          max={180}
          step={0.01}
          value={longitude}
          onChange={onLongitude}
        />
        <NumberField
          id="pvgis-loss"
          label="PVGIS system losses"
          unit="%"
          hint="Cables, inverter, and soiling sent to PVGIS. Temperature loss is calculated by PVGIS, not by this field."
          min={0}
          max={40}
          step={1}
          value={lossPercent}
          onChange={onLoss}
        />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onFetch}
          disabled={status === "loading"}
          aria-busy={status === "loading"}
          className="min-h-11 border border-solar/80 bg-solar px-4 py-2 font-sans text-[0.68rem] font-medium tracking-[0.16em] text-navy uppercase transition-colors duration-300 disabled:border-solar/50 disabled:bg-transparent disabled:text-paper"
        >
          {status === "loading" ? "Fetching PVGIS" : status === "ready" ? "Refresh PVGIS" : "Fetch PVGIS estimate"}
        </button>
        {status !== "demo" ? (
          <button
            type="button"
            onClick={onUseDemo}
            className="min-h-11 font-sans text-[0.68rem] font-medium tracking-[0.16em] text-mute uppercase transition-colors duration-300 hover:text-paper"
          >
            Use demo production
          </button>
        ) : null}
        {lossPercent !== defaultSystemLossPercent ? (
          <button
            type="button"
            onClick={() => onLoss(defaultSystemLossPercent)}
            className="font-sans text-[0.68rem] font-medium tracking-[0.16em] text-cyan uppercase transition-colors duration-300 hover:text-paper"
          >
            Use {defaultSystemLossPercent}% losses
          </button>
        ) : null}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-mute">
        After the first fetch, changing the coordinates or the system-loss percent requests PVGIS again. Capacity, tariff, and installed cost do not.
      </p>
      <div
        className="mt-5 border-t border-white/10 pt-4"
        aria-live={status === "error" ? "assertive" : "polite"}
        role={status === "error" ? "alert" : "status"}
      >
        {status === "demo" ? (
          <p className="text-sm leading-relaxed text-paper/70">
            Production is the illustrative demo model for {place}, {formatCoordinate(latitude, longitude)}. Costs and tariffs on the cards are illustrative either way.
          </p>
        ) : null}
        {status === "loading" ? (
          <p className="text-sm leading-relaxed text-cyan">
            Fetching a PVGIS 5.3 estimate for {formatCoordinate(latitude, longitude)}. The cards stay on the demo model until it returns.
          </p>
        ) : null}
        {status === "error" && error ? (
          <p className="text-sm leading-relaxed text-paper/70">
            {error} The energy cards are using the illustrative demo model. Costs were not taken from PVGIS.
          </p>
        ) : null}
        {status === "ready" && estimate ? (
          <div className="space-y-3 text-sm leading-relaxed text-paper/70">
            <p>
              <span className="text-cyan">PVGIS 5.3</span> for {place}, {formatCoordinate(estimate.latitude, estimate.longitude)}
              {estimate.elevationM != null ? `, elevation ${formatNumber(estimate.elevationM, 0)} m` : ""}. Radiation database {estimate.radiationDatabase}, {years}. Technology {estimate.technology}. Requested peak power {formatNumber(estimate.peakPowerKw, 0)} kW, so E_y is kWh/year and E_m is kWh/month for that kilowatt.
            </p>
            {active ? (
              <p>
                Sent to PVGIS: {pvgisSystems[activeScenarioId].summary} PVGIS returned {active.mounting}, slope {formatNumber(active.slopeDeg, 0)}°, azimuth {formatNumber(active.azimuthDeg, 0)}°, system losses {formatNumber(active.systemLossPercent, 0)}%, and total losses of {formatNumber(active.totalLossPercent, 1)}%. In-plane irradiation H(i)_d is {formatNumber(active.inPlaneIrradiationKwhPerM2Day, 2)} kWh/m²/day. Annual yield E_y is {formatNumber(active.specificYieldKwhPerKw, 0)} kWh per kW per year.
              </p>
            ) : (
              <p>
                PVGIS did not return {activeScenarioId} ({activeError ?? "no estimate"}). This scenario is using the illustrative demo yield. Cost assumptions are unchanged.
              </p>
            )}
            {estimate.weather ? (
              <p>
                Open-Meteo now: {formatNumber(estimate.weather.temperatureC, 1)}°C, {estimate.weather.summary.toLowerCase()}, cloud cover {formatNumber(estimate.weather.cloudCoverPercent, 0)}%. Observed {estimate.weather.observedAt} {estimate.weather.timezone}. Current weather is context only and is not used in the energy estimate.
              </p>
            ) : (
              <p>{estimate.weatherNote}</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
