"use client";

import { NumberField } from "@/components/analytics/NumberField";
import {
  formatCapacity,
  formatNumber,
  formatPoles,
  gridEmission,
  type AssumptionKey,
  type ScenarioDefinition,
  type ScenarioParameters,
} from "@/lib/analytics";
import { cx } from "@/lib/cx";

type AssumptionEditorProps = {
  scenario: ScenarioDefinition;
  capacityKw: number;
  params: ScenarioParameters;
  co2KgPerKwh: number;
  poleCount: number | null;
  onCapacity: (capacityKw: number) => void;
  onParam: (key: AssumptionKey, value: number) => void;
  onCo2: (kgPerKwh: number) => void;
  onReset: () => void;
  usingPvgis?: boolean;
};

export function AssumptionEditor({
  scenario,
  capacityKw,
  params,
  co2KgPerKwh,
  poleCount,
  onCapacity,
  onParam,
  onCo2,
  onReset,
  usingPvgis = false,
}: AssumptionEditorProps) {
  const atTypical = capacityKw === scenario.typicalCapacityKw;
  const gridIsDefault = co2KgPerKwh === gridEmission.defaultKgPerKwh;

  return (
    <div className="mt-10 border-t border-white/10 pt-8">
      {usingPvgis ? (
        <p className="mb-8 max-w-3xl text-sm leading-relaxed text-paper/60">
          Peak sun hours, performance ratio, and water-cooling gain are not used while PVGIS production is on. Battery round-trip still scales streetlight energy. Tariff, installed cost, and operations stay illustrative and are not sent to PVGIS.
        </p>
      ) : null}
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <NumberField
            id="system-capacity"
            label="System capacity"
            unit="kW of PV"
            hint={scenario.capacityHint}
            min={scenario.capacity.min}
            max={scenario.capacity.max}
            step={scenario.capacity.step}
            value={capacityKw}
            onChange={onCapacity}
          />
          <input
            type="range"
            min={scenario.capacity.min}
            max={scenario.capacity.max}
            step={scenario.capacity.step}
            value={capacityKw}
            aria-label="Adjust system capacity in kilowatts"
            onChange={(event) => onCapacity(Number(event.target.value))}
            className="mt-5 h-1.5 w-full cursor-pointer accent-solar"
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => onCapacity(scenario.typicalCapacityKw)}
              disabled={atTypical}
              className={cx(
                "font-sans text-[0.68rem] font-medium tracking-[0.16em] uppercase transition-colors duration-300",
                atTypical ? "text-paper/25" : "text-cyan hover:text-paper",
              )}
            >
              Typical size {formatCapacity(scenario.typicalCapacityKw)} kW
            </button>
          </div>
          {poleCount != null ? (
            <p className="mt-4 text-sm leading-relaxed text-paper/60">
              About {formatPoles(poleCount)} poles at {formatNumber(params.wpPerPole, 0)} Wp each.
              This count is capacity divided by the panel size. It is not a lighting layout.
            </p>
          ) : null}
        </div>
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:col-span-8">
          {scenario.fields.map((field) => (
            <NumberField
              key={field.key}
              id={`assumption-${field.key}`}
              label={field.label}
              unit={field.unit}
              hint={field.hint}
              min={field.min}
              max={field.max}
              step={field.step}
              value={params[field.key] * field.scale}
              onChange={(display) => onParam(field.key, display / field.scale)}
            />
          ))}
          <div>
            <NumberField
              id="assumption-co2"
              label={gridEmission.label}
              unit={gridEmission.unit}
              hint={gridEmission.hint}
              min={gridEmission.min}
              max={gridEmission.max}
              step={gridEmission.step}
              value={co2KgPerKwh}
              onChange={onCo2}
            />
            <button
              type="button"
              onClick={() => onCo2(gridEmission.defaultKgPerKwh)}
              disabled={gridIsDefault}
              className={cx(
                "mt-3 font-sans text-[0.68rem] font-medium tracking-[0.16em] uppercase transition-colors duration-300",
                gridIsDefault ? "text-paper/25" : "text-cyan hover:text-paper",
              )}
            >
              Use {formatNumber(gridEmission.defaultKgPerKwh, 3)}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="min-h-11 font-sans text-[0.68rem] font-medium tracking-[0.16em] text-mute uppercase transition-colors duration-300 hover:text-paper"
        >
          Reset this scenario
        </button>
      </div>
    </div>
  );
}
