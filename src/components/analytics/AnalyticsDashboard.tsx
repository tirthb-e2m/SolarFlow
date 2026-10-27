"use client";

import { AssumptionEditor } from "@/components/analytics/AssumptionEditor";
import { AssumptionsPanel } from "@/components/analytics/AssumptionsPanel";
import { CostBreakdownChart } from "@/components/analytics/CostBreakdownChart";
import { LocationPanel } from "@/components/analytics/LocationPanel";
import { MonthlyGenerationChart } from "@/components/analytics/MonthlyGenerationChart";
import { ScenarioComparisonChart } from "@/components/analytics/ScenarioComparisonChart";
import { ScenarioPicker } from "@/components/analytics/ScenarioPicker";
import { SummaryCards } from "@/components/analytics/SummaryCards";
import { useChartMotion } from "@/components/analytics/use-reduced-motion";
import { useSolarEstimate } from "@/components/analytics/use-solar-estimate";
import {
  compareAtCapacity,
  costChartNote,
  defaultCapacities,
  defaultParameters,
  evaluatePlant,
  formatCapacity,
  formatInrSmart,
  gridEmission,
  monthlyShapeNote,
  scenarios,
  type AssumptionKey,
  type ScenarioId,
  type ScenarioParameters,
  type SolarYieldInput,
} from "@/lib/analytics";
import { useState } from "react";

function initialParameters(): Record<ScenarioId, ScenarioParameters> {
  return {
    rooftop: defaultParameters("rooftop"),
    streetlight: defaultParameters("streetlight"),
    floating: defaultParameters("floating"),
  };
}

export function AnalyticsDashboard() {
  const [activeId, setActiveId] = useState<ScenarioId>("rooftop");
  const [capacityById, setCapacityById] = useState(defaultCapacities);
  const [paramsById, setParamsById] = useState(initialParameters);
  const [co2KgPerKwh, setCo2KgPerKwh] = useState<number>(gridEmission.defaultKgPerKwh);
  const animate = useChartMotion();
  const solar = useSolarEstimate();

  const scenario = scenarios[activeId];
  const capacityKw = capacityById[activeId];
  const params = paramsById[activeId];
  const yieldsById: Partial<Record<ScenarioId, SolarYieldInput>> = {};
  if (solar.status === "ready" && solar.estimate) {
    for (const id of ["rooftop", "streetlight", "floating"] as const) {
      const row = solar.estimate.scenarios[id];
      if (!row) continue;
      yieldsById[id] = {
        specificYieldKwhPerKw: row.specificYieldKwhPerKw,
        monthlyKwhPerKw: row.monthlyKwhPerKw,
      };
    }
  }
  const result = evaluatePlant(capacityKw, scenario, params, co2KgPerKwh, yieldsById[activeId] ?? null);
  const comparison = compareAtCapacity(capacityKw, paramsById, co2KgPerKwh, yieldsById);
  const usingPvgis = result.production.source === "pvgis";
  const totalLabel = formatInrSmart(result.installationCostInr).value;
  const sourceLabel = usingPvgis ? "PVGIS" : "Demo model";
  const kicker = `${sourceLabel} · ${scenario.name} · ${formatCapacity(result.capacityKw)} kW`;
  const monthlyCaption = usingPvgis
    ? "Months are PVGIS average monthly energy (E_m, kWh/month) for this site and mounting, scaled to your capacity and any battery round-trip. They are a multi-year average, not this month's weather."
    : monthlyShapeNote;
  const costCaption = usingPvgis
    ? "Illustrative installed-cost shares. PVGIS is not a price source. Amounts follow your rupees-per-kW rate and the capacity you set."
    : costChartNote;
  const comparisonCaption = usingPvgis
    ? "Each scenario keeps its own illustrative price and tariff. Energy uses that scenario's PVGIS estimate when one was returned, sized at the capacity above. Payback does not change with size in this straight-line cost model."
    : undefined;

  return (
    <div>
      <LocationPanel
        latitude={solar.latitude}
        longitude={solar.longitude}
        lossPercent={solar.lossPercent}
        status={solar.status}
        error={solar.error}
        estimate={solar.estimate}
        activeScenarioId={activeId}
        onLatitude={solar.setLatitude}
        onLongitude={solar.setLongitude}
        onLoss={solar.setLossPercent}
        onPreset={(latitude, longitude) => {
          solar.setLatitude(latitude);
          solar.setLongitude(longitude);
        }}
        onFetch={solar.request}
        onUseDemo={solar.useDemo}
      />
      <div className="mt-10">
        <ScenarioPicker activeId={activeId} onSelect={setActiveId} />
      </div>
      <p className="sr-only" aria-live="polite">
        {scenario.name}
      </p>
      <div key={activeId} className="dash-rise">
        <AssumptionEditor
          scenario={scenario}
          capacityKw={capacityKw}
          params={params}
          co2KgPerKwh={co2KgPerKwh}
          poleCount={result.poleCount}
          onCapacity={(next) =>
            setCapacityById((current) => ({
              ...current,
              [activeId]: next,
            }))
          }
          onParam={(key: AssumptionKey, value: number) =>
            setParamsById((current) => ({
              ...current,
              [activeId]: { ...current[activeId], [key]: value },
            }))
          }
          onCo2={setCo2KgPerKwh}
          onReset={() => {
            setCapacityById((current) => ({
              ...current,
              [activeId]: scenario.typicalCapacityKw,
            }));
            setParamsById((current) => ({
              ...current,
              [activeId]: defaultParameters(activeId),
            }));
          }}
          usingPvgis={usingPvgis}
        />
        <SummaryCards result={result} />
        <div className="mt-12 grid gap-px bg-white/10 lg:grid-cols-2">
          <MonthlyGenerationChart
            kicker={kicker}
            points={result.monthly}
            animate={animate}
            caption={monthlyCaption}
          />
          <CostBreakdownChart
            kicker={kicker}
            slices={result.costBreakdown}
            totalLabel={totalLabel}
            animate={animate}
            caption={costCaption}
          />
          <ScenarioComparisonChart
            rows={comparison}
            activeId={activeId}
            capacityKw={result.capacityKw}
            animate={animate}
            caption={comparisonCaption}
          />
        </div>
        <AssumptionsPanel scenario={scenario} result={result} />
      </div>
    </div>
  );
}
