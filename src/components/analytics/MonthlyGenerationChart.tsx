"use client";

import { ChartHeading, DataTable, TooltipCard } from "@/components/analytics/ChartFrame";
import { axisTick, chart, tooltipShell } from "@/components/analytics/chart-theme";
import {
  energyAxisUnit,
  formatEnergyTick,
  formatNumber,
  monthlyShapeNote,
  type MonthlyPoint,
} from "@/lib/analytics";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

type MonthlyGenerationChartProps = {
  kicker: string;
  points: MonthlyPoint[];
  animate: boolean;
  caption?: string;
};

function MonthlyTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || payload.length === 0) return null;
  const raw = payload[0]?.value;
  const value = typeof raw === "number" ? raw : Number(raw ?? 0);
  return (
    <TooltipCard label={String(label ?? "Month")}>
      <p>{formatNumber(value, 0)} kWh</p>
    </TooltipCard>
  );
}

export function MonthlyGenerationChart({
  kicker,
  points,
  animate,
  caption = monthlyShapeNote,
}: MonthlyGenerationChartProps) {
  const maxKwh = Math.max(...points.map((point) => point.kwh), 0);
  const unit = energyAxisUnit(maxKwh);

  return (
    <article className="min-w-0 bg-navy p-5 md:p-7 lg:col-span-2">
      <ChartHeading
        kicker={kicker}
        title="Monthly energy generation"
        caption={caption}
        unit={unit}
      />
      <p className="mb-3 font-sans text-[0.68rem] tracking-[0.14em] text-mute uppercase sm:hidden">
        Swipe for every month
      </p>
      <div className="overflow-x-auto overscroll-x-contain pb-2">
        <div className="h-72 min-w-[34rem]" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 288 }}>
            <BarChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chart.grid} vertical={false} />
              <XAxis
                dataKey="monthShort"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                interval={0}
                tickMargin={8}
              />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(value: number) => formatEnergyTick(value, maxKwh)}
              />
              <Tooltip
                content={MonthlyTooltip}
                cursor={{ fill: chart.cursor }}
                wrapperStyle={tooltipShell}
              />
              <Bar
                dataKey="kwh"
                name="Generation"
                fill={chart.solar}
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
                isAnimationActive={animate}
                animationDuration={650}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <DataTable
        caption="Monthly energy generation in kilowatt-hours"
        headers={["Month", "Generation (kWh)"]}
        rows={points.map((point) => [point.month, formatNumber(point.kwh, 0)])}
      />
    </article>
  );
}
