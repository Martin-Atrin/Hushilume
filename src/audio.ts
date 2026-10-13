import limiterUrl from "./limiter-worklet.ts?worker&url";
import { normalizationGain, type Loudness } from "./loudness";
import { randomStart } from "./random-start";
import { localAudioUrl } from "./native";
export type Track = {
  id: string;
  title: string;
  artist: string;
  station: string;
  file: string;
  duration: number;
  source: string;
  license: string;
  loudness?: Loudness;
};
type Deck = {
  media: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  normalization: GainNode;
  track: Track;
  cleanup?: number;
  disposed: boolean;
};
const FADE = 5;
export class AmbientAudio {
  private context?: AudioContext;
  private output?: AudioWorkletNode;
  private outputReady?: Promise<void>;
  private library?: Promise<Track[]>;
  private tracks: Track[] = [];
  private bags = new Map<string, Track[]>();
  private current?: Deck;
  private next?: Deck;
  private decks = new Set<Deck>();
  private station = "";
  private generation = 0;
  private active = false;
  private changing = false;
  private timer?: number;
  private starts: Record<string, number> = {};
  constructor() {
    try {
      this.starts = JSON.parse(localStorage.getItem("ambient-starts") ?? "{}");
    } catch {}
  }
  onError: (message: string) => void = () => {};
  private async loadLibrary() {
    this.library ??= fetch("/library.json")
      .then(async (response) => {
        if (!response.ok) throw Error("The local library is not ready.");
        const data = await response.json();
        return data.tracks as Track[];
      })
      .catch((error) => {
        this.library = undefined;
        throw error;
      });
    this.tracks = await this.library;
    this.tracks = await Promise.all(
      this.tracks.map(async (track) => ({
        ...track,
        file: await localAudioUrl(track.file),
      })),
    );
  }
  private pick(station: string, avoid?: string): Track {
    let bag = this.bags.get(station);
    if (!bag?.length) {
      bag = this.tracks.filter((t) => t.station === station);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1].id === avoid)
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      this.bags.set(station, bag);
    }
    // Weight by duration so a long recording contributes its fair share of listening time.
    const candidates = bag
      .map((track, index) => ({ track, index }))
      .filter((item) => bag!.length === 1 || item.track.id !== avoid);
    let draw =
      Math.random() *
      candidates.reduce((sum, item) => sum + item.track.duration, 0);
    let selected = candidates[candidates.length - 1];
    for (const item of candidates) {
      draw -= item.track.duration;
      if (draw <= 0) {
        selected = item;
        break;
      }
    }
    if (!selected) throw Error("No local tracks for this scene.");
    return bag.splice(selected.index, 1)[0];
  }
  private make(track: Track): Deck {
    const media = new Audio();
    media.src = track.file;
    media.preload = "auto";
    const source = this.context!.createMediaElementSource(media),
      gain = this.context!.createGain(),
      normalization = this.context!.createGain();
    gain.gain.value = 0;
    normalization.gain.value = this.output
      ? normalizationGain(track.loudness)
      : 1;
    source
      .connect(normalization)
      .connect(gain)
      .connect(this.output ?? this.context!.destination);
    const deck: Deck = {
      media,
      source,
      gain,
      normalization,
      track,
      disposed: false,
    };
    this.decks.add(deck);
    media.addEventListener("timeupdate", () => this.tick());
    media.addEventListener("ended", () => this.tick());
    media.load();
    return deck;
  }
  private ready(deck: Deck): Promise<void> {
    if (deck.media.readyState >= 3) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        deck.media.removeEventListener("canplay", ok);
        deck.media.removeEventListener("error", fail);
        error ? reject(error) : resolve();
      };
      const ok = () => finish();
      const fail = () => finish(Error("Could not read " + deck.track.title));
      const timer = window.setTimeout(
        () => finish(Error("Audio took too long to load.")),
        20000,
      );
      deck.media.addEventListener("canplay", ok, { once: true });
      deck.media.addEventListener("error", fail, { once: true });
    });
  }
  private ramp(deck: Deck, target: number, seconds: number) {
    const now = this.context!.currentTime;
    deck.gain.gain.cancelAndHoldAtTime(now);
    deck.gain.gain.linearRampToValueAtTime(target, now + seconds);
  }
  private dispose(deck: Deck) {
    if (deck.disposed) return;
    deck.disposed = true;
    clearTimeout(deck.cleanup);
    deck.media.pause();
    deck.media.removeAttribute("src");
    deck.media.load();
    deck.source.disconnect();
    deck.gain.disconnect();
    deck.normalization.disconnect();
    this.decks.delete(deck);
  }
  private retire(deck: Deck, seconds = FADE) {
    this.ramp(deck, 0, seconds);
    clearTimeout(deck.cleanup);
    deck.cleanup = window.setTimeout(
      () => this.dispose(deck),
      seconds * 1000 + 100,
    );
  }
  private preload() {
    if (this.next) this.dispose(this.next);
    this.next = this.make(this.pick(this.station, this.current?.track.id));
  }
  async play(station: string, overrides?: Track[]) {
    const generation = ++this.generation;
    this.context ??= new AudioContext();
    await this.context.resume();
    this.outputReady ??= this.context.audioWorklet
      .addModule(limiterUrl)
      .then(() => {
        this.output = new AudioWorkletNode(this.context!, "hushilume-limiter", {
          outputChannelCount: [2],
        });
        this.output.connect(this.context!.destination);
      })
      .catch((error) => {
        console.warn(
          "Loudness normalization unavailable; using original levels.",
          error,
        );
      });
    await this.outputReady;
    if (overrides) this.tracks = overrides;
    else await this.loadLibrary();
    if (generation !== this.generation) return;
    if (this.current && this.station === station) {
      this.active = true;
      this.changing = false;
      if (!this.next) this.preload();
      clearTimeout(this.current.cleanup);
      await this.current.media.play();
      if (generation !== this.generation) return;
      this.ramp(this.current, 0.8, 1.5);
      this.startTimer();
      return;
    }
    const incoming = this.make(this.pick(station));
    try {
      await this.ready(incoming);
      if (generation !== this.generation) {
        this.dispose(incoming);
        return;
      }
      const offset = randomStart(
        incoming.media.duration,
        this.starts[incoming.track.id],
      );
      incoming.media.currentTime = offset;
      this.starts[incoming.track.id] = offset;
      try {
        localStorage.setItem("ambient-starts", JSON.stringify(this.starts));
      } catch {}
      await incoming.media.play();
    } catch (error) {
      this.dispose(incoming);
      throw error;
    }
    if (generation !== this.generation) {
      this.dispose(incoming);
      return;
    }
    const old = this.current;
    this.current = incoming;
    this.station = station;
    this.active = true;
    this.changing = false;
    this.ramp(incoming, 0.8, old ? FADE : 1.5);
    if (old) this.retire(old);
    this.preload();
    this.startTimer();
  }
  pause() {
    ++this.generation;
    this.active = false;
    this.changing = false;
    clearInterval(this.timer);
    for (const deck of this.decks) {
      if (deck === this.current) {
        this.ramp(deck, 0, 1.5);
        clearTimeout(deck.cleanup);
        deck.cleanup = window.setTimeout(() => deck.media.pause(), 1550);
      } else if (deck !== this.next) this.retire(deck, 1.5);
    }
  }
  private startTimer() {
    clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), 250);
  }
  private tick() {
    if (!this.active || this.changing || !this.current || !this.next) return;
    const remaining =
      this.current.media.duration - this.current.media.currentTime;
    const fadeWindow = Math.min(FADE, this.current.media.duration / 3);
    if (
      !Number.isFinite(remaining) ||
      remaining > fadeWindow + Math.min(0.25, fadeWindow / 4) ||
      this.current.media.currentTime < this.current.media.duration / 2
    )
      return;
    const generation = this.generation;
    const incoming = this.next;
    this.next = undefined;
    this.changing = true;
    void (async () => {
      try {
        await this.ready(incoming);
        if (generation !== this.generation) {
          this.dispose(incoming);
          return;
        }
        await incoming.media.play();
        if (generation !== this.generation) {
          this.dispose(incoming);
          return;
        }
        const old = this.current!;
        this.current = incoming;
        const fade = Math.max(
          0.2,
          Math.min(FADE, old.media.duration - old.media.currentTime),
        );
        this.ramp(incoming, 0.8, fade);
        this.retire(old, fade);
        this.preload();
      } catch (error) {
        this.dispose(incoming);
        if (generation === this.generation) {
          this.active = false;
          clearInterval(this.timer);
          this.onError(String(error));
        }
      } finally {
        if (generation === this.generation) this.changing = false;
      }
    })();
  }
  reset() {
    ++this.generation;
    this.active = false;
    this.changing = false;
    clearInterval(this.timer);
    for (const deck of this.decks) this.dispose(deck);
    this.current = undefined;
    this.next = undefined;
    this.station = "";
    this.bags.clear();
  }
  getStatus() {
    return {
      normalization: this.output
        ? "measured-track-gain-with-peak-limiter"
        : "unavailable",
      active: this.active,
      station: this.station,
      current: this.current
        ? {
            id: this.current.track.id,
            title: this.current.track.title,
            time: this.current.media.currentTime,
            duration: this.current.media.duration,
            paused: this.current.media.paused,
          }
        : null,
      next: this.next?.track.id,
      decks: [...this.decks].map((d) => ({
        id: d.track.id,
        time: d.media.currentTime,
        paused: d.media.paused,
        gain: d.gain.gain.value,
        normalizationGain: d.normalization.gain.value,
        loudness: d.track.loudness,
      })),
      context: this.context?.state,
    };
  }
  // Allows the browser acceptance test to exercise a real end-of-track transition.
  seek(seconds: number) {
    if (this.current)
      this.current.media.currentTime = Math.max(
        0,
        Math.min(seconds, this.current.media.duration),
      );
  }
}
