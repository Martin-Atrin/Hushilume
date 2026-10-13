import { defaults, type Card } from "./scenes.ts";
export type Source = {
  kind: "library" | "files" | "youtube" | "spotify" | "soundcloud";
  url: string;
  files: { name: string; uri: string }[];
};
export type Notch = {
  preset: "auto" | "none" | "teardrop" | "wide" | "pill" | "hole";
  side: "auto" | "left" | "right" | "top";
  width: number;
  depth: number;
  offset: number;
};
export type AppConfig = { version: 1; cards: Card[]; notch: Notch };
const key = "ambiance-settings-v1";
export const emptySource = (): Source => ({
  kind: "library",
  url: "",
  files: [],
});
export function defaultConfig(): AppConfig {
  return {
    version: 1,
    cards: structuredClone(defaults),
    notch: { preset: "auto", side: "auto", width: 90, depth: 27, offset: 50 },
  };
}
export function validateConfig(value: AppConfig): AppConfig {
  if (
    value.version !== 1 ||
    !Array.isArray(value.cards) ||
    value.cards.length !== 4
  )
    throw Error("Four cards are required.");
  for (const card of value.cards) {
    if (
      !card.name.trim() ||
      card.name.length > 40 ||
      !/^#[0-9a-f]{6}$/i.test(card.color)
    )
      throw Error("Use a card name and a valid color.");
    if (card.scenes.length !== 3) throw Error("Each card needs three scenes.");
    for (const scene of card.scenes) {
      if (!scene.name.trim() || scene.name.length > 60)
        throw Error("Use a scene name of 1–60 characters.");
      for (const asset of [scene.poster, scene.video])
        if (asset && !/^(\/|asset:|https:\/\/)/.test(asset))
          throw Error("Use an imported file or an HTTPS media URL.");
      const source = scene.source;
      if (
        !source ||
        !["library", "files", "youtube", "spotify", "soundcloud"].includes(
          source.kind,
        )
      )
        throw Error("Choose a media source.");
      if (source.kind === "files" && !source.files.length)
        throw Error("Choose at least one audio file.");
      if (["youtube", "spotify", "soundcloud"].includes(source.kind))
        providerUrl(source.kind, source.url);
    }
  }
  if (
    !["auto", "none", "teardrop", "wide", "pill", "hole"].includes(
      value.notch.preset,
    ) ||
    !["auto", "left", "right", "top"].includes(value.notch.side)
  )
    throw Error("Choose a notch style and side.");
  for (const [field, min, max] of [
    ["width", 20, 300],
    ["depth", 5, 90],
    ["offset", 10, 90],
  ] as const) {
    const number = Number(value.notch[field]);
    if (!Number.isFinite(number) || number < min || number > max)
      throw Error(`Notch ${field} must be ${min}–${max}.`);
    value.notch[field] = number;
  }
  return value;
}
export function providerUrl(kind: string, input: string): string {
  const url = new URL(input);
  if (url.protocol !== "https:") throw Error("Use an HTTPS provider link.");
  const host = url.hostname.replace(/^www\./, "");
  if (
    kind === "youtube" &&
    ["youtube.com", "m.youtube.com", "youtu.be"].includes(host)
  ) {
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : (url.searchParams.get("v") ??
          url.pathname.split("/").filter(Boolean).at(-1));
    if (!id || !/^[\w-]{11}$/.test(id))
      throw Error("Use a YouTube video link.");
    return `https://www.youtube.com/embed/${id}?playsinline=1&rel=0`;
  }
  if (kind === "spotify" && host === "open.spotify.com") {
    const parts = url.pathname
      .split("/")
      .filter(Boolean)
      .filter((p) => !p.startsWith("intl-"));
    if (
      !["track", "album", "playlist", "episode", "show"].includes(parts[0]) ||
      !/^[a-zA-Z0-9]+$/.test(parts[1] ?? "")
    )
      throw Error("Use a Spotify track, album, or playlist link.");
    return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`;
  }
  if (
    kind === "soundcloud" &&
    host === "soundcloud.com" &&
    url.pathname.split("/").filter(Boolean).length >= 2
  )
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.origin + url.pathname)}&auto_play=false`;
  throw Error("The link does not match the selected provider.");
}
export async function loadConfig(): Promise<AppConfig> {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return validateConfig(JSON.parse(saved));
  } catch {
    /* Recover to the installed defaults. */
  }
  const base = defaultConfig();
  try {
    const response = await fetch("/profile.json");
    if (response.ok) {
      const privateCards = await response.json();
      if (Array.isArray(privateCards))
        base.cards = privateCards.map((card) => ({
          ...card,
          scenes: card.scenes.map((scene: object) => ({
            ...scene,
            source: emptySource(),
          })),
        }));
    }
    return validateConfig(base);
  } catch {
    return defaultConfig();
  }
}
export function saveConfig(value: AppConfig) {
  localStorage.setItem(key, JSON.stringify(validateConfig(value)));
}
