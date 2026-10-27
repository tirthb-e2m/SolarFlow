import { scenarioList } from "./scenarios";
import type {
  PlantResult,
  ScenarioDefinition,
  ScenarioId,
  ScenarioParameters,
  SolarYieldInput,
} from "./types";

/**
 * Year-1 plant model.
 * Pass a PVGIS yield to replace the demo sun-hours formula. Cost, tariff,
 * operations, and the CO₂ factor always stay in the local assumptions.
 * This file does not read the network or the DOM.
 */

const MONTHS = [
  { month: "January", monthShort: "Jan" },
  { month: "February", monthShort: "Feb" },
  { month: "March", monthShort: "Mar" },
  { month: "April", monthShort: "Apr" },
  { month: "May", monthShort: "May" },
  { month: "June", monthShort: "Jun" },
  { month: "July", monthShort: "Jul" },
  { month: "August", monthShort: "Aug" },
  { month: "September", monthShort: "Sep" },
  { month: "October", monthShort: "Oct" },
  { month: "November", monthShort: "Nov" },
  { month: "December", monthShort: "Dec" },
] as const;

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function unitInterval(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function appliedParameters(input: ScenarioParameters): ScenarioParameters {
  return {
    peakSunHours: nonNegative(input.peakSunHours),
    performanceRatio: unitInterval(input.performanceRatio),
    yieldGain: clamp(input.yieldGain, 0, 0.5),
    storageRoundTrip: unitInterval(input.storageRoundTrip),
    creditFraction: unitInterval(input.creditFraction),
    tariffInrPerKwh: nonNegative(input.tariffInrPerKwh),
    capexInrPerKw: nonNegative(input.capexInrPerKw),
    oAndMFraction: unitInterval(input.oAndMFraction),
    wpPerPole: nonNegative(input.wpPerPole),
  };
}

export function specificYieldKwhPerKw(params: ScenarioParameters): number {
  return (
    params.peakSunHours *
    365 *
    params.performanceRatio *
    (1 + params.yieldGain) *
    params.storageRoundTrip
  );
}

function usableYield(solarYield: SolarYieldInput | null | undefined): SolarYieldInput | null {
  if (!solarYield) return null;
  if (!Number.isFinite(solarYield.specificYieldKwhPerKw) || solarYield.specificYieldKwhPerKw < 0) {
    return null;
  }
  if (solarYield.monthlyKwhPerKw.length !== 12) return null;
  if (solarYield.monthlyKwhPerKw.some((value) => !Number.isFinite(value) || value < 0)) return null;
  return solarYield;
}

export function evaluatePlant(
  capacityKwInput: number,
  scenario: ScenarioDefinition,
  paramsInput: ScenarioParameters,
  co2KgPerKwhInput: number,
  solarYield?: SolarYieldInput | null,
): PlantResult {
  const applied = appliedParameters(paramsInput);
  const capacityKw = nonNegative(capacityKwInput);
  const co2KgPerKwh = nonNegative(co2KgPerKwhInput);
  const pvgisYield = usableYield(solarYield);
  const specificYieldBeforeDelivery = pvgisYield
    ? pvgisYield.specificYieldKwhPerKw
    : applied.peakSunHours * 365 * applied.performanceRatio * (1 + applied.yieldGain);
  const deliveryFactor = applied.storageRoundTrip;
  const specificYield = specificYieldBeforeDelivery * deliveryFactor;
  const annualGenerationKwh = capacityKw * specificYield;
  const monthlyWeights = pvgisYield ? pvgisYield.monthlyKwhPerKw : scenario.monthlyWeights;
  const creditedKwh = annualGenerationKwh * applied.creditFraction;
  const installationCostInr = capacityKw * applied.capexInrPerKw;
  const annualGrossSavingsInr = creditedKwh * applied.tariffInrPerKwh;
  const annualOmInr = installationCostInr * applied.oAndMFraction;
  const annualSavingsInr = annualGrossSavingsInr - annualOmInr;

  let paybackYears: number | null;
  if (annualSavingsInr <= 0) {
    paybackYears = null;
  } else if (installationCostInr <= 0) {
    paybackYears = 0;
  } else {
    paybackYears = installationCostInr / annualSavingsInr;
  }

  const co2Kg = annualGenerationKwh * co2KgPerKwh;
  const weightTotal = monthlyWeights.reduce((sum, weight) => sum + weight, 0);
  const monthly = MONTHS.map((month, index) => {
    const weight = monthlyWeights[index] ?? 0;
    const kwh = weightTotal > 0 ? (annualGenerationKwh * weight) / weightTotal : 0;
    return { month: month.month, monthShort: month.monthShort, kwh };
  });

  const shareTotal = scenario.costShares.reduce((sum, part) => sum + part.share, 0);
  const costBreakdown = scenario.costShares.map((part) => {
    const share = shareTotal > 0 ? part.share / shareTotal : 0;
    return {
      id: part.id,
      label: part.label,
      share,
      inr: installationCostInr * share,
    };
  });

  const poleCount = applied.wpPerPole > 0 ? (capacityKw * 1000) / applied.wpPerPole : null;

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    chartLabel: scenario.chartLabel,
    capacityKw,
    specificYieldKwhPerKw: specificYield,
    annualGenerationKwh,
    creditedKwh,
    installationCostInr,
    annualGrossSavingsInr,
    annualOmInr,
    annualSavingsInr,
    paybackYears,
    co2Kg,
    co2Tonnes: co2Kg / 1000,
    poleCount,
    monthly,
    costBreakdown,
    applied,
    co2KgPerKwh,
    production: {
      source: pvgisYield ? "pvgis" : "demo",
      specificYieldBeforeDelivery,
      deliveryFactor,
    },
  };
}

/** Runs every scenario at one capacity so the comparison shares a size. */
export function compareAtCapacity(
  capacityKw: number,
  paramsById: Record<ScenarioId, ScenarioParameters>,
  co2KgPerKwh: number,
  yieldsById?: Partial<Record<ScenarioId, SolarYieldInput | null>>,
): PlantResult[] {
  return scenarioList.map((scenario) =>
    evaluatePlant(
      capacityKw,
      scenario,
      paramsById[scenario.id],
      co2KgPerKwh,
      yieldsById?.[scenario.id] ?? null,
    ),
  );
}
