import type { Source } from "./config";
export type Scene = {
  name: string;
  station: string;
  poster: string;
  video?: string;
  source: Source;
};
export type Card = {
  name: string;
  key: string;
  color: string;
  scenes: Scene[];
};
const definitions = [
  [
    "Nature",
    "nature",
    "#b9dc9c",
    ["Forest dawn", "Along the river", "Rain, gently"],
    ["forest", "river", "rain"],
  ],
  [
    "Lo-fi",
    "lofi",
    "#e8b8c5",
    ["After hours", "Window seat", "Sunday morning"],
    ["night", "rain", "day"],
  ],
  [
    "Lounge",
    "lounge",
    "#ecc187",
    ["The golden hour", "Piano room", "Above the city"],
    ["jazz", "piano", "city"],
  ],
  [
    "Focus",
    "focus",
    "#9acbdc",
    ["Deep blue", "Weightless", "Quiet orbit"],
    ["ocean", "clouds", "space"],
  ],
] as const;
export const defaults: Card[] = definitions.map(
  ([name, key, color, names, ids]) => ({
    name,
    key,
    color,
    scenes: names.map((name, i) => ({
      name,
      station: `${key}-${ids[i]}`,
      poster: `/ambiance/${key}.svg`,
      source: { kind: "library", url: "", files: [] },
    })),
  }),
);
// Kept for content tooling. Runtime cards come from the validated user configuration.
export const styles = defaults;
