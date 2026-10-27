"use client";

import { ChartHeading, DataTable, TooltipCard } from "@/components/analytics/ChartFrame";
import { costPalette, tooltipShell } from "@/components/analytics/chart-theme";
import { costChartNote, formatInr, formatInrSmart, formatNumber, type CostSlice } from "@/lib/analytics";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TooltipContentProps } from "recharts";

type CostBreakdownChartProps = {
  kicker: string;
  slices: CostSlice[];
  totalLabel: string;
  animate: boolean;
  caption?: string;
};

type SliceTip = CostSlice & { fill?: string };

function CostTooltip({ active, payload }: TooltipContentProps) {
  if (!active || payload.length === 0) return null;
  const slice = payload[0]?.payload as SliceTip | undefined;
  if (!slice) return null;
  return (
    <TooltipCard label={slice.label}>
      <p>{formatInr(slice.inr, 0)}</p>
      <p className="font-sans text-sm tracking-normal text-paper/60">
        {formatNumber(slice.share * 100, 0)}% of installed cost
      </p>
    </TooltipCard>
  );
}

export function CostBreakdownChart({
  kicker,
  slices,
  totalLabel,
  animate,
  caption = costChartNote,
}: CostBreakdownChartProps) {
  const colored = slices.map((slice, index) => ({
    ...slice,
    fill: costPalette[index % costPalette.length],
  }));

  return (
    <article className="min-w-0 bg-navy p-5 md:p-7">
      <ChartHeading
        kicker={kicker}
        title="Installation cost breakdown"
        caption={caption}
      />
      <div className="grid items-center gap-6 sm:grid-cols-[12.5rem_minmax(0,1fr)]">
        <div className="relative mx-auto h-52 w-full max-w-[12.5rem]" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 200, height: 208 }}>
            <PieChart>
              <Pie
                data={colored}
                dataKey="inr"
                nameKey="label"
                innerRadius="64%"
                outerRadius="88%"
                paddingAngle={2}
                stroke="none"
                isAnimationActive={animate}
                animationDuration={650}
              >
                {colored.map((slice) => (
                  <Cell key={slice.id} fill={slice.fill} />
                ))}
              </Pie>
              <Tooltip content={CostTooltip} wrapperStyle={tooltipShell} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center">
            <div>
              <p className="font-display text-[1.35rem] leading-none tracking-[-0.03em] text-paper">
                {totalLabel}
              </p>
              <p className="mt-2 font-sans text-[0.65rem] tracking-[0.16em] text-mute uppercase">
                Installed
              </p>
            </div>
          </div>
        </div>
        <ul className="flex flex-col">
          {colored.map((slice) => {
            const money = formatInrSmart(slice.inr);
            return (
              <li
                key={slice.id}
                className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5"
                title={money.exact ?? money.value}
              >
                <span className="flex min-w-0 items-baseline gap-3">
                  <span
                    className="inline-block size-2 shrink-0"
                    style={{ backgroundColor: slice.fill }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-paper">{slice.label}</span>
                    <span className="font-sans text-[0.65rem] tracking-[0.14em] text-mute uppercase">
                      {formatNumber(slice.share * 100, 0)}%
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right font-display text-lg tracking-[-0.03em] text-paper tabular-nums">
                  {money.value}
                  {money.exact ? <span className="sr-only"> ({money.exact})</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <DataTable
        caption="Installation cost breakdown in Indian rupees"
        headers={["Component", "Share", "Amount"]}
        rows={slices.map((slice) => [
          slice.label,
          `${formatNumber(slice.share * 100, 0)}%`,
          formatInr(slice.inr, 0),
        ])}
      />
    </article>
  );
}
