import type {
  ScenarioDefinition,
  ScenarioId,
  ScenarioParameters,
} from "./types";

/**
 * Illustrative Indian seasonal shape, relative to an average month.
 * Higher in the pre-monsoon months, lower in July and August.
 * Not a meteorological station file. Shared so scenarios differ by yield
 * assumptions rather than by a hardcoded monthly kilowatt-hour table.
 */
export const illustrativeMonthlyWeights = [
  0.95, 1.05, 1.18, 1.22, 1.2, 0.92, 0.72, 0.75, 0.98, 1.12, 1.02, 0.89,
] as const;

export const monthlyShapeNote =
  "Each month is a share of the annual total, using one illustrative Indian seasonal shape: stronger before the monsoon, lighter in July and August. It is not a weather file, and it is the same shape for every scenario.";

export const costChartNote =
  "Each amount is that share of the installed cost. Capacity and the rupees-per-kW rate change the amounts. The shares stay with the scenario.";

export const gridEmission = {
  label: "Grid CO₂ factor",
  unit: "kg / kWh",
  min: 0.2,
  max: 1.2,
  step: 0.001,
  defaultKgPerKwh: 0.716,
  hint: "Illustrative kilograms of CO₂ avoided per generated kWh. Chosen near published Indian grid factors. Not a live CEA value.",
} as const;

export const assumptionBasis =
  "Starting figures are illustrative planning assumptions for an Indian demo: rooftop year-1 yield near 1,400 kWh per kW before you edit anything, floating capital cost in the mid-₹50,000s per kW, and streetlight capital cost that includes the battery and the pole. They are not a tender, a CEA bulletin, or a quotation.";

export const modelLimits = [
  "Year-1 yield only. Module degradation is not applied.",
  "Cost scales in a straight line with capacity. Fixed project costs and bulk discounts are not modelled.",
  "Simple payback divides installed cost by one year of savings. It is not a discounted return.",
  "No subsidy, tax, loan, land cost, or curtailment is applied.",
  "CO₂ uses generated kilowatt-hours, including energy that is not given a tariff credit. The grid factor is illustrative.",
  "A PVGIS fetch replaces only the energy yield and the monthly shape. Price, tariff, and operations stay the illustrative figures in this panel.",
] as const;

export const demoDisclaimer =
  "Costs, tariffs, and the CO₂ factor are illustrative estimates for a product demo. They are not a quotation or a utility bill. Money is in Indian rupees. Lakh (L) and crore (Cr) shorten the large figures; the exact rupee amount is shown with them. Energy stays on the built-in demo model until you fetch PVGIS. PVGIS figures are multi-year averages for the system described beside them, not a meter reading.";

const rooftop: ScenarioDefinition = {
  id: "rooftop",
  name: "Rooftop Solar",
  chartLabel: "Rooftop",
  kicker: "Array",
  blurb: "A grid-tied home array. Year-1 yield, a pre-subsidy cost, and a residential tariff.",
  capacityHint: "Homes are often 2–10 kW. This slider runs up to 100 kW.",
  typicalCapacityKw: 5,
  capacity: { min: 0.5, max: 100, step: 0.5 },
  defaults: {
    peakSunHours: 5,
    performanceRatio: 0.78,
    yieldGain: 0,
    storageRoundTrip: 1,
    creditFraction: 1,
    tariffInrPerKwh: 7.5,
    capexInrPerKw: 48000,
    oAndMFraction: 0.012,
    wpPerPole: 0,
  },
  monthlyWeights: illustrativeMonthlyWeights,
  costShares: [
    { id: "modules", label: "PV modules", share: 0.52 },
    { id: "inverter", label: "Inverter", share: 0.14 },
    { id: "mounting", label: "Mounting structure", share: 0.12 },
    { id: "cabling", label: "Cabling and protection", share: 0.1 },
    { id: "installation", label: "Installation", share: 0.12 },
  ],
  fields: [
    {
      key: "peakSunHours",
      label: "Peak sun hours",
      unit: "h / day",
      min: 3,
      max: 7,
      step: 0.1,
      scale: 1,
      hint: "Illustrative annual average. Not a weather-station year.",
    },
    {
      key: "performanceRatio",
      label: "Performance ratio",
      unit: "%",
      min: 55,
      max: 90,
      step: 1,
      scale: 100,
      hint: "Year-1 losses from heat, soiling, inverter, and wiring.",
    },
    {
      key: "creditFraction",
      label: "Credited share",
      unit: "%",
      min: 0,
      max: 100,
      step: 1,
      scale: 100,
      hint: "Share of generation valued at the tariff. 100% is a simple net-metering sketch.",
    },
    {
      key: "tariffInrPerKwh",
      label: "Electricity tariff",
      unit: "₹ / kWh",
      min: 2,
      max: 15,
      step: 0.1,
      scale: 1,
      hint: "Illustrative residential rate for each credited kilowatt-hour.",
    },
    {
      key: "capexInrPerKw",
      label: "Installed cost",
      unit: "₹ / kW",
      min: 20000,
      max: 100000,
      step: 500,
      scale: 1,
      hint: "Pre-subsidy turnkey rate per kW. Subsidy is not deducted.",
    },
    {
      key: "oAndMFraction",
      label: "Operations",
      unit: "% of cost / year",
      min: 0,
      max: 5,
      step: 0.1,
      scale: 100,
      hint: "Yearly upkeep as a percent of installed cost, subtracted from savings.",
    },
  ],
  notes: [
    "Installed cost is a pre-subsidy turnkey rate. Central and state subsidies are not deducted.",
    "Credited share is the portion of generation valued at the tariff. 100% stands in for a simple net-metering sketch, not a state regulation.",
    "The performance ratio bundles soiling, temperature, inverter, and wiring losses for year 1.",
  ],
};

const streetlight: ScenarioDefinition = {
  id: "streetlight",
  name: "Solar Streetlights",
  chartLabel: "Streetlights",
  kicker: "Lamp",
  blurb: "Poles with a panel, battery, and lamp. Savings are the grid electricity the lamp no longer draws.",
  capacityHint: "6 kW of panels is about 50 poles at 120 Wp. The rate includes the pole, battery, and lamp.",
  typicalCapacityKw: 6,
  capacity: { min: 0.5, max: 60, step: 0.5 },
  defaults: {
    peakSunHours: 4.8,
    performanceRatio: 0.72,
    yieldGain: 0,
    storageRoundTrip: 0.88,
    creditFraction: 1,
    tariffInrPerKwh: 8,
    capexInrPerKw: 220000,
    oAndMFraction: 0.02,
    wpPerPole: 120,
  },
  monthlyWeights: illustrativeMonthlyWeights,
  costShares: [
    { id: "modules", label: "PV module", share: 0.16 },
    { id: "battery", label: "Battery", share: 0.3 },
    { id: "lamp", label: "LED and driver", share: 0.12 },
    { id: "pole", label: "Pole and foundation", share: 0.22 },
    { id: "wiring", label: "Controller and wiring", share: 0.1 },
    { id: "installation", label: "Installation", share: 0.1 },
  ],
  fields: [
    {
      key: "peakSunHours",
      label: "Peak sun hours",
      unit: "h / day",
      min: 3,
      max: 7,
      step: 0.1,
      scale: 1,
      hint: "Illustrative annual average at the pole. Not a city weather file.",
    },
    {
      key: "performanceRatio",
      label: "Performance ratio",
      unit: "%",
      min: 55,
      max: 90,
      step: 1,
      scale: 100,
      hint: "Panel and controller losses before the battery.",
    },
    {
      key: "storageRoundTrip",
      label: "Battery round-trip",
      unit: "%",
      min: 70,
      max: 96,
      step: 1,
      scale: 100,
      hint: "Share of panel energy that can be delivered after storage.",
    },
    {
      key: "wpPerPole",
      label: "Panel per pole",
      unit: "Wp",
      min: 40,
      max: 300,
      step: 10,
      scale: 1,
      hint: "Used only to estimate how many poles this capacity represents.",
    },
    {
      key: "tariffInrPerKwh",
      label: "Electricity tariff",
      unit: "₹ / kWh",
      min: 2,
      max: 15,
      step: 0.1,
      scale: 1,
      hint: "Illustrative public-lighting rate for energy the lamp no longer takes from the grid.",
    },
    {
      key: "capexInrPerKw",
      label: "Installed cost",
      unit: "₹ / kW",
      min: 80000,
      max: 400000,
      step: 1000,
      scale: 1,
      hint: "Per kW of panel, including battery, lamp, pole, and foundation.",
    },
    {
      key: "oAndMFraction",
      label: "Operations",
      unit: "% of cost / year",
      min: 0,
      max: 5,
      step: 0.1,
      scale: 100,
      hint: "Yearly upkeep, including battery care, as a percent of installed cost.",
    },
  ],
  notes: [
    "Installed cost per kW of panel includes the battery, lamp, pole, and foundation, which is why it is much higher than a rooftop array.",
    "Annual savings count only the grid electricity the lamp no longer draws. Avoided cable-laying is not given a cash value.",
    "Pole count is panel capacity divided by watt-peak per pole. It is not a road-lighting design.",
    "Battery round-trip efficiency reduces the energy valued as delivered.",
  ],
};

const floating: ScenarioDefinition = {
  id: "floating",
  name: "Floating Solar",
  chartLabel: "Floating",
  kicker: "Water",
  blurb: "Modules on a reservoir. Includes an illustrative cooling gain and a utility-style tariff.",
  capacityHint: "1,000 kW is a 1 MW pilot. Costs in this demo still scale in a straight line per kW.",
  typicalCapacityKw: 1000,
  capacity: { min: 100, max: 10000, step: 50 },
  defaults: {
    peakSunHours: 5.2,
    performanceRatio: 0.8,
    yieldGain: 0.07,
    storageRoundTrip: 1,
    creditFraction: 1,
    tariffInrPerKwh: 4.2,
    capexInrPerKw: 58000,
    oAndMFraction: 0.015,
    wpPerPole: 0,
  },
  monthlyWeights: illustrativeMonthlyWeights,
  costShares: [
    { id: "modules", label: "PV modules", share: 0.4 },
    { id: "floats", label: "Floats and anchoring", share: 0.22 },
    { id: "inverter", label: "Inverter and electrical", share: 0.16 },
    { id: "mooring", label: "Installation and mooring", share: 0.14 },
    { id: "grid", label: "Grid interconnection", share: 0.08 },
  ],
  fields: [
    {
      key: "peakSunHours",
      label: "Peak sun hours",
      unit: "h / day",
      min: 3,
      max: 7,
      step: 0.1,
      scale: 1,
      hint: "Illustrative annual average over the water. Not a reservoir study.",
    },
    {
      key: "performanceRatio",
      label: "Performance ratio",
      unit: "%",
      min: 55,
      max: 90,
      step: 1,
      scale: 100,
      hint: "Year-1 system losses before the cooling gain.",
    },
    {
      key: "yieldGain",
      label: "Water-cooling gain",
      unit: "%",
      min: 0,
      max: 15,
      step: 0.5,
      scale: 100,
      hint: "Extra year-1 yield assumed for modules over water.",
    },
    {
      key: "tariffInrPerKwh",
      label: "Electricity tariff",
      unit: "₹ / kWh",
      min: 1.5,
      max: 12,
      step: 0.1,
      scale: 1,
      hint: "Illustrative power-purchase rate, not a discovered bid.",
    },
    {
      key: "capexInrPerKw",
      label: "Installed cost",
      unit: "₹ / kW",
      min: 30000,
      max: 120000,
      step: 500,
      scale: 1,
      hint: "Turnkey rate per kW, including floats, anchoring, and electrical works.",
    },
    {
      key: "oAndMFraction",
      label: "Operations",
      unit: "% of cost / year",
      min: 0,
      max: 5,
      step: 0.1,
      scale: 100,
      hint: "Yearly upkeep as a percent of installed cost, subtracted from savings.",
    },
  ],
  notes: [
    "The water-cooling gain is an illustrative uplift on year-1 yield, not a measured bonus for a reservoir.",
    "The tariff is an illustrative power-purchase rate, lower than a typical home retail tariff.",
    "Floats, anchoring, and grid interconnection are included in the cost shares.",
  ],
};

export const scenarios = {
  rooftop,
  streetlight,
  floating,
} satisfies Record<ScenarioId, ScenarioDefinition>;

export const scenarioList: readonly ScenarioDefinition[] = [
  scenarios.rooftop,
  scenarios.streetlight,
  scenarios.floating,
];

for (const scenario of scenarioList) {
  if (scenario.monthlyWeights.length !== 12) {
    throw new Error(`${scenario.id} needs 12 monthly weights.`);
  }
  const shareTotal = scenario.costShares.reduce((sum, part) => sum + part.share, 0);
  if (Math.abs(shareTotal - 1) > 1e-9) {
    throw new Error(`${scenario.id} cost shares sum to ${shareTotal}.`);
  }
}

export function defaultParameters(id: ScenarioId): ScenarioParameters {
  return { ...scenarios[id].defaults };
}

export function defaultCapacities(): Record<ScenarioId, number> {
  return {
    rooftop: scenarios.rooftop.typicalCapacityKw,
    streetlight: scenarios.streetlight.typicalCapacityKw,
    floating: scenarios.floating.typicalCapacityKw,
  };
}
