import { theme } from "@/theme/tokens";

/** Chart fills drawn from the dusk palette, plus two tints so six cost shares stay distinct. */
export const chart = {
  grid: "rgba(247, 248, 250, 0.08)",
  tick: theme.color.mute,
  solar: theme.color.solar,
  solarSoft: theme.color.solarSoft,
  cyan: theme.color.cyan,
  paper: theme.color.paper,
  cursor: "rgba(247, 248, 250, 0.05)",
  font: "var(--font-outfit), ui-sans-serif, sans-serif",
} as const;

export const costPalette = [
  theme.color.solar,
  theme.color.solarSoft,
  "#ffd7a8",
  theme.color.cyan,
  "#9adff0",
  theme.color.paper,
] as const;

export const axisTick = {
  fill: chart.tick,
  fontSize: 12,
  fontFamily: chart.font,
} as const;

export const tooltipShell = {
  background: "transparent",
  border: "none",
  padding: 0,
  boxShadow: "none",
} as const;
