export type ScenarioId = "rooftop" | "streetlight" | "floating";

/** Editable plant assumptions. A later solar API can fill this object. */
export type ScenarioParameters = {
  /** Average daily peak sun hours for the year. */
  peakSunHours: number;
  /** Year-1 performance ratio before extra yield or storage losses. 0–1. */
  performanceRatio: number;
  /** Extra yield fraction. Used for the floating-solar cooling illustration. */
  yieldGain: number;
  /** Fraction of generated energy delivered after storage. 1 when there is no battery. */
  storageRoundTrip: number;
  /** Fraction of generation that is given a tariff value. */
  creditFraction: number;
  /** Rupees credited per kilowatt-hour. */
  tariffInrPerKwh: number;
  /** Turnkey installed cost in rupees per kilowatt of PV. */
  capexInrPerKw: number;
  /** Yearly operations cost as a fraction of installed cost. */
  oAndMFraction: number;
  /** Panel watt-peak used only to estimate a streetlight pole count. 0 when unused. */
  wpPerPole: number;
};

export type AssumptionKey = keyof ScenarioParameters;

export type AssumptionField = {
  key: AssumptionKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  /** Display value = model value × scale. Percent fields use 100. */
  scale: number;
  hint: string;
};

export type CostShare = {
  id: string;
  label: string;
  /** Fraction of installed cost. Shares in a scenario sum to 1. */
  share: number;
};

export type ScenarioDefinition = {
  id: ScenarioId;
  name: string;
  chartLabel: string;
  kicker: string;
  blurb: string;
  capacityHint: string;
  typicalCapacityKw: number;
  capacity: {
    min: number;
    max: number;
    step: number;
  };
  defaults: ScenarioParameters;
  /** Twelve relative weights. The model normalises them to the annual total. */
  monthlyWeights: readonly number[];
  costShares: readonly CostShare[];
  fields: readonly AssumptionField[];
  notes: readonly string[];
};

export type MonthlyPoint = {
  month: string;
  monthShort: string;
  kwh: number;
};

export type CostSlice = {
  id: string;
  label: string;
  share: number;
  inr: number;
};

/** Per-kW solar yield. Present only when production comes from PVGIS. */
export type SolarYieldInput = {
  /** kWh per kW per year before local delivery factors such as battery round-trip. */
  specificYieldKwhPerKw: number;
  /** January–December kWh per kW per month, before local delivery factors. */
  monthlyKwhPerKw: readonly number[];
};

export type ProductionMeta = {
  source: "demo" | "pvgis";
  /** Yield before battery round-trip. */
  specificYieldBeforeDelivery: number;
  /** Local factor applied after the solar source. 1 when there is no battery. */
  deliveryFactor: number;
};

export type PlantResult = {
  scenarioId: ScenarioId;
  scenarioName: string;
  chartLabel: string;
  capacityKw: number;
  specificYieldKwhPerKw: number;
  annualGenerationKwh: number;
  creditedKwh: number;
  installationCostInr: number;
  annualGrossSavingsInr: number;
  annualOmInr: number;
  annualSavingsInr: number;
  /** Null when savings do not recover the installed cost. */
  paybackYears: number | null;
  co2Kg: number;
  co2Tonnes: number;
  /** Null when this scenario does not estimate poles. */
  poleCount: number | null;
  monthly: MonthlyPoint[];
  costBreakdown: CostSlice[];
  applied: ScenarioParameters;
  co2KgPerKwh: number;
  production: ProductionMeta;
};
