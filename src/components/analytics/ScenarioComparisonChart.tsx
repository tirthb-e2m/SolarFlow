"use client";

import { ChartHeading, DataTable, TooltipCard } from "@/components/analytics/ChartFrame";
import { axisTick, chart, tooltipShell } from "@/components/analytics/chart-theme";
import {
  formatCapacity,
  formatCo2,
  formatEnergy,
  formatInr,
  formatInrTick,
  paybackReading,
  type PlantResult,
  type ScenarioId,
} from "@/lib/analytics";
import { cx } from "@/lib/cx";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

type ScenarioComparisonChartProps = {
  rows: PlantResult[];
  activeId: ScenarioId;
  capacityKw: number;
  animate: boolean;
  caption?: string;
};

function ComparisonTooltip({ active, payload }: TooltipContentProps) {
  if (!active || payload.length === 0) return null;
  const row = payload[0]?.payload as PlantResult | undefined;
  if (!row) return null;
  const energy = formatEnergy(row.annualGenerationKwh);
  const co2 = formatCo2(row.co2Tonnes);
  const payback = paybackReading(row.paybackYears);
  return (
    <TooltipCard label={row.scenarioName}>
      <p className="font-sans text-sm leading-relaxed tracking-normal text-paper">
        {energy.exact ?? `${energy.value} ${energy.unit}`}
      </p>
      <p className="font-sans text-sm leading-relaxed tracking-normal text-paper">
        Installed {formatInr(row.installationCostInr, 0)}
      </p>
      <p className="font-sans text-sm leading-relaxed tracking-normal text-paper">
        Savings {formatInr(row.annualSavingsInr, 0)} / year
      </p>
      <p className="font-sans text-sm leading-relaxed tracking-normal text-paper">
        Payback {payback.value} {payback.unit}
      </p>
      <p className="font-sans text-sm leading-relaxed tracking-normal text-paper">
        CO₂ {co2.exact ?? `${co2.value} ${co2.unit}`}
      </p>
    </TooltipCard>
  );
}

export function ScenarioComparisonChart({
  rows,
  activeId,
  capacityKw,
  animate,
  caption = "Each scenario keeps the assumptions you set for it. All three are sized at the capacity above, so the bars share a scale. In this straight-line model, payback does not change with size; the savings do.",
}: ScenarioComparisonChartProps) {
  const maxSavings = Math.max(...rows.map((row) => Math.abs(row.annualSavingsInr)), 0);

  return (
    <article className="min-w-0 bg-navy p-5 md:p-7">
      <ChartHeading
        kicker={`Compared at ${formatCapacity(capacityKw)} kW`}
        title="Scenario comparison"
        caption={caption}
        unit="₹ / year"
      />
      <div className="h-52" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 208 }}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chart.grid} horizontal={false} />
            <XAxis
              type="number"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatInrTick(value, maxSavings)}
            />
            <YAxis
              type="category"
              dataKey="chartLabel"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              width={96}
            />
            <Tooltip content={ComparisonTooltip} cursor={{ fill: chart.cursor }} wrapperStyle={tooltipShell} />
            <Bar
              dataKey="annualSavingsInr"
              name="Annual savings"
              radius={[0, 3, 3, 0]}
              maxBarSize={22}
              isAnimationActive={animate}
              animationDuration={650}
            >
              {rows.map((row) => (
                <Cell
                  key={row.scenarioId}
                  fill={row.scenarioId === activeId ? chart.solar : chart.cyan}
                  fillOpacity={row.scenarioId === activeId ? 1 : 0.72}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-6 grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-3">
        {rows.map((row) => {
          const payback = paybackReading(row.paybackYears);
          const energy = formatEnergy(row.annualGenerationKwh);
          const active = row.scenarioId === activeId;
          return (
            <li key={row.scenarioId}>
              <p
                className={cx(
                  "font-sans text-[0.65rem] font-medium tracking-[0.16em] uppercase",
                  active ? "text-solar" : "text-mute",
                )}
              >
                {row.chartLabel}
              </p>
              <p className="mt-2 font-display text-2xl leading-none tracking-[-0.03em] text-paper tabular-nums">
                {payback.value}
                {payback.unit === "years" ? (
                  <span className="ml-1 font-sans text-xs tracking-normal text-mute">years</span>
                ) : null}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-mute">
                {energy.value} {energy.unit}
              </p>
            </li>
          );
        })}
      </ul>
      <DataTable
        caption={`Scenario comparison at ${formatCapacity(capacityKw)} kilowatts`}
        headers={["Scenario", "Generation", "Installed cost", "Annual savings", "Payback", "CO₂ avoided"]}
        rows={rows.map((row) => {
          const energy = formatEnergy(row.annualGenerationKwh);
          const co2 = formatCo2(row.co2Tonnes);
          const payback = paybackReading(row.paybackYears);
          return [
            row.scenarioName,
            energy.exact ?? `${energy.value} ${energy.unit}`,
            formatInr(row.installationCostInr, 0),
            formatInr(row.annualSavingsInr, 0),
            `${payback.value} ${payback.unit}`,
            co2.exact ?? `${co2.value} ${co2.unit}`,
          ];
        })}
      />
    </article>
  );
}
