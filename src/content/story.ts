export const site = {
  name: "SolarFlow",
  description:
    "A dusk walk through stored daylight — from a city roof to a streetlamp, a field on the water, and the ledger of the day.",
} as const;

export const hero = {
  id: "horizon",
  index: "01",
  kicker: "Horizon",
  lines: ["What the roof", "remembers", "of the sun."] as const,
  emphasisIndex: 1,
  subtitle:
    "Follow stored daylight from the array overhead to the lamp on the corner, the field on the water, and the quiet numbers of the day.",
  scrollLabel: "Scroll to explore",
  sceneLabel: "Scene stage",
  sceneNote: "The roof opens in the scroll below.",
  bearing: "28.61°N · dusk",
} as const;

export type StoryBeat = {
  id: string;
  index: string;
  nav: string;
  kicker: string;
  title: string;
  lede: string;
};

export const beats = {
  rooftop: {
    id: "rooftop",
    index: "02",
    nav: "Rooftop",
    kicker: "Array",
    title: "A roof that keeps noon.",
    lede: "Panels take the high sun and hold it for the hours after the sky goes dark.",
  },
  streetlight: {
    id: "streetlight",
    index: "03",
    nav: "Streetlight",
    kicker: "Lamp",
    title: "A lamp lit by the afternoon.",
    lede: "Charge stored on the roof steps down into the street as dusk settles on the navy sky.",
  },
  floating: {
    id: "floating-solar",
    index: "04",
    nav: "Floating",
    kicker: "Water",
    title: "A field laid on the water.",
    lede: "Arrays ride the surface, lifting daylight off the glare and out of the tide.",
  },
  analytics: {
    id: "analytics",
    index: "05",
    nav: "Analytics",
    kicker: "Ledger",
    title: "The day, read back.",
    lede: "Yield, cost, and the hours a system might give back — an illustrative ledger, not a meter reading.",
  },
} as const satisfies Record<string, StoryBeat>;

export const beatList: StoryBeat[] = [
  beats.rooftop,
  beats.streetlight,
  beats.floating,
  beats.analytics,
];

export const ending = {
  kicker: "After the light",
  title: "Held, then given back.",
  lede: "The roof, the lamps, and the water have kept one day. The ledger reads it back.",
} as const;
