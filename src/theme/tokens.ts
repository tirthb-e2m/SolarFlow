/**
 * Dusk palette for SolarFlow.
 * Hex values are mirrored by the @theme block in src/app/globals.css.
 */
export const theme = {
  name: "solarflow-dusk",
  color: {
    navy: "#06101c",
    navyDeep: "#03060d",
    navyLift: "#102033",
    paper: "#f7f8fa",
    mute: "#9aa6b8",
    solar: "#ff6a1a",
    solarSoft: "#ffb15a",
    cyan: "#3ce7ff",
    white: "#ffffff",
  },
} as const;

export type ThemeColor = keyof typeof theme.color;
