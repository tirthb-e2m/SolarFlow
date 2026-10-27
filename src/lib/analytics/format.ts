import type { PlantResult } from "./types";

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatInr(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Compact Indian units for figures from one lakh upward. */
export function formatInrCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) {
    return `${sign}₹${formatNumber(abs / 1_00_00_000, 2)} Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}₹${formatNumber(abs / 1_00_000, 2)} L`;
  }
  return inrWhole.format(value);
}

export function formatInrSmart(value: number): { value: string; exact: string | null } {
  const exact = inrWhole.format(value);
  if (Math.abs(value) < 1_00_000) return { value: exact, exact: null };
  return { value: formatInrCompact(value), exact };
}

export function formatCapacity(kw: number): string {
  const digits = Number.isInteger(kw) ? 0 : 1;
  return formatNumber(kw, digits);
}

export function formatPoles(count: number): string {
  const nearest = Math.round(count);
  if (Math.abs(count - nearest) < 0.05) return formatNumber(nearest, 0);
  return formatNumber(count, 1);
}

export function formatInput(value: number, step: number): string {
  const text = String(step);
  const dot = text.indexOf(".");
  const digits = dot === -1 ? 0 : text.length - dot - 1;
  return value.toFixed(digits);
}

export type EnergyReading = {
  value: string;
  unit: string;
  exact: string | null;
};

export function formatEnergy(kwh: number): EnergyReading {
  const exact = `${formatNumber(kwh, 0)} kWh / year`;
  if (Math.abs(kwh) >= 1_000_000) {
    return { value: formatNumber(kwh / 1_000_000, 2), unit: "GWh / year", exact };
  }
  if (Math.abs(kwh) >= 10_000) {
    return { value: formatNumber(kwh / 1000, 1), unit: "MWh / year", exact };
  }
  return { value: formatNumber(kwh, 0), unit: "kWh / year", exact: null };
}

export function formatKwh(kwh: number): string {
  return `${formatNumber(kwh, 0)} kWh`;
}

export type Co2Reading = {
  value: string;
  unit: string;
  exact: string | null;
};

export function formatCo2(tonnes: number): Co2Reading {
  const exact = `${formatNumber(tonnes, 1)} t CO₂ / year`;
  if (Math.abs(tonnes) >= 1000) {
    return { value: formatNumber(tonnes / 1000, 2), unit: "kt CO₂ / year", exact };
  }
  const digits = Math.abs(tonnes) >= 100 ? 0 : 1;
  return { value: formatNumber(tonnes, digits), unit: "t CO₂ / year", exact: null };
}

export function energyAxisUnit(maxKwh: number): string {
  if (maxKwh >= 1_000_000) return "GWh";
  if (maxKwh >= 10_000) return "MWh";
  return "kWh";
}

export function formatEnergyTick(kwh: number, maxKwh: number): string {
  if (maxKwh >= 1_000_000) return formatNumber(kwh / 1_000_000, 2);
  if (maxKwh >= 10_000) return formatNumber(kwh / 1000, 0);
  return formatNumber(kwh, 0);
}

export function formatInrTick(value: number, max: number): string {
  const absMax = Math.abs(max);
  if (absMax >= 1_00_00_000) return `${formatNumber(value / 1_00_00_000, 1)} Cr`;
  if (absMax >= 1_00_000) return `${formatNumber(value / 1_00_000, 1)} L`;
  if (absMax >= 1000) return `${formatNumber(value / 1000, 0)}k`;
  return formatNumber(value, 0);
}

export type PaybackReading = {
  value: string;
  unit: string;
  detail: string;
};

export function paybackReading(years: number | null): PaybackReading {
  if (years === null || !Number.isFinite(years)) {
    return {
      value: "No payback",
      unit: "Savings do not cover cost",
      detail: "Annual savings are zero or negative, so the installed cost is not recovered.",
    };
  }
  if (years > 80) {
    return {
      value: "Over 80",
      unit: "years",
      detail: "Electricity savings alone do not recover this cost on a usual planning horizon.",
    };
  }
  const digits = years < 15 ? 1 : 0;
  return {
    value: formatNumber(years, digits),
    unit: "years",
    detail:
      years > 25
        ? "Electricity savings alone do not recover this cost within 25 years."
        : "Installed cost divided by one year of savings. Not a financed return.",
  };
}

export type SummaryItem = {
  id: string;
  label: string;
  value: string;
  unit: string;
  detail: string;
};

export function summaryItems(result: PlantResult): SummaryItem[] {
  const energy = formatEnergy(result.annualGenerationKwh);
  const cost = formatInrSmart(result.installationCostInr);
  const savings = formatInrSmart(result.annualSavingsInr);
  const payback = paybackReading(result.paybackYears);
  const co2 = formatCo2(result.co2Tonnes);
  const perKw = formatInr(result.applied.capexInrPerKw, 0);
  const fromPvgis = result.production.source === "pvgis";
  const yieldDetail = fromPvgis
    ? `${formatNumber(result.specificYieldKwhPerKw, 0)} kWh per kW from PVGIS${
        result.production.deliveryFactor < 0.999
          ? `, after ${formatNumber(result.production.deliveryFactor * 100, 0)}% battery delivery`
          : ""
      }. Costs are illustrative.`
    : `Illustrative demo model. ${formatNumber(result.specificYieldKwhPerKw, 0)} kWh per kW in year 1. Degradation is not applied.`;
  const credit = result.applied.creditFraction;
  const creditNote =
    credit < 0.999 ? `${formatNumber(credit * 100, 0)}% of generation is credited. ` : "";

  return [
    {
      id: "generation",
      label: "Annual energy generation",
      value: energy.value,
      unit: energy.unit,
      detail: energy.exact ? `${energy.exact}. ${yieldDetail}` : yieldDetail,
    },
    {
      id: "cost",
      label: "Estimated installation cost",
      value: cost.value,
      unit: "Indian rupees",
      detail: fromPvgis
        ? `${cost.exact ? `${cost.exact} exact. ` : ""}${perKw} per kW. Illustrative price, not from PVGIS.`
        : cost.exact
          ? `${cost.exact} exact. ${perKw} per kW. Illustrative price.`
          : `${perKw} per kW. Illustrative price.`,
    },
    {
      id: "savings",
      label: "Annual savings",
      value: savings.value,
      unit: "per year, after operations",
      detail: `${creditNote}${formatInr(result.annualGrossSavingsInr, 0)} from the illustrative tariff, minus ${formatInr(result.annualOmInr, 0)} operations.`,
    },
    {
      id: "payback",
      label: "Payback period",
      value: payback.value,
      unit: payback.unit,
      detail: payback.detail,
    },
    {
      id: "co2",
      label: "CO₂ emissions avoided",
      value: co2.value,
      unit: co2.unit,
      detail: `${co2.exact ? `${co2.exact}. ` : ""}${formatNumber(result.co2KgPerKwh, 3)} kg CO₂ per kWh generated. The grid factor is illustrative${fromPvgis ? " and is not from PVGIS" : ""}.`,
    },
  ];
}

export type ReadingLine = {
  id: string;
  label: string;
  text: string;
};

export function readingLines(result: PlantResult): ReadingLine[] {
  const applied = result.applied;
  const energy = formatEnergy(result.annualGenerationKwh);
  const co2 = formatCo2(result.co2Tonnes);
  const payback = paybackReading(result.paybackYears);
  const battery =
    applied.storageRoundTrip < 0.999
      ? ` × ${formatNumber(applied.storageRoundTrip * 100, 0)}% battery round-trip`
      : "";
  const cooling =
    result.production.source === "demo" && applied.yieldGain > 0
      ? ` × ${formatNumber(1 + applied.yieldGain, 2)} water-cooling factor`
      : "";
  const generationText =
    result.production.source === "pvgis"
      ? `${formatNumber(result.production.specificYieldBeforeDelivery, 0)} kWh per kW per year from PVGIS (E_y, kWh/year for 1 kW) × ${formatCapacity(result.capacityKw)} kW${battery}. Peak sun hours, performance ratio, and the water-cooling gain are not applied. Model result: ${energy.exact ?? `${energy.value} ${energy.unit}`}.`
      : `${formatCapacity(result.capacityKw)} kW × ${formatNumber(applied.peakSunHours, 1)} peak sun hours/day × 365 days × ${formatNumber(applied.performanceRatio * 100, 0)}% performance ratio${cooling}${battery}. Model result: ${energy.exact ?? `${energy.value} ${energy.unit}`} (${formatNumber(result.specificYieldKwhPerKw, 0)} kWh per kW).`;

  return [
    {
      id: "generation",
      label: "Annual generation",
      text: generationText,
    },
    {
      id: "cost",
      label: "Installation cost",
      text: `${result.production.source === "pvgis" ? "Illustrative cost, not from PVGIS. " : ""}${formatCapacity(result.capacityKw)} kW × ${formatInr(applied.capexInrPerKw, 0)} per kW. Model result: ${formatInr(result.installationCostInr, 0)}.`,
    },
    {
      id: "savings",
      label: "Annual savings",
      text: `${formatKwh(result.creditedKwh)} credited × ${formatInr(applied.tariffInrPerKwh, 2)} per kWh illustrative tariff, minus ${formatInr(result.annualOmInr, 0)} operations (${formatNumber(applied.oAndMFraction * 100, 1)}% of installed cost). Model result: ${formatInr(result.annualSavingsInr, 0)} per year.`,
    },
    {
      id: "payback",
      label: "Payback",
      text: `Installed cost ÷ annual savings. Model result: ${payback.value} ${payback.unit}.`,
    },
    {
      id: "co2",
      label: "CO₂ avoided",
      text: `${formatKwh(result.annualGenerationKwh)} generated × ${formatNumber(result.co2KgPerKwh, 3)} kg CO₂ per kWh. Model result: ${co2.exact ?? `${co2.value} ${co2.unit}`}.`,
    },
  ];
}
