import "./style.css";
import { AmbientAudio } from "./audio";
import { loadConfig } from "./config";
import { resolveMedia } from "./media-store";
import { createSettings, openProvider } from "./settings";
import { AmbientMotion } from "./motion";
let config = await loadConfig();
let styles = config.cards;
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
import { VideoLoop } from "./video-loop";
import { ScreenWake } from "./screen-wake";
import { configureNativeScreen } from "./native";
import { crossfadeImage } from "./image-crossfade";
import { configureContours } from "./contours";
configureNativeScreen();
const icon = (playing: boolean) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${playing ? '<path d="M8 6v12M16 6v12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' : '<path d="m9 5 10 7-10 7Z" fill="currentColor"/>'}</svg>`;
export const audio = new AmbientAudio();
export const screenWake = new ScreenWake();
const variants = [0, 0, 0, 0];
let active = 0;
let playing = false;
let mode: "controls" | "entering" | "ambient" | "exiting" = "controls";
let idleTimer: number | undefined;
let transitionTimer: number | undefined;
let mediaGeneration = 0;
let mediaReady = false;
let audioGeneration = 0;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const duration = () => (reducedMotion.matches ? 50 : 1600);
document.querySelector("#app")!.innerHTML = `
 <main class="room" data-mode="controls" aria-label="Ambiance music player">
 <nav class="pads" aria-label="Sound styles">${styles
   .map(
     (
       style,
       i,
     ) => `<button class="pad" data-index="${i}" style="--color:${style.color}" aria-label="${escape(style.name)}" aria-pressed="${i === 0}">
 <span class="pad-media" aria-hidden="true"><img src="${escape(style.scenes[0].poster)}" alt="" draggable="false"></span><span class="tint"></span>
 <span class="pad-label"><span class="style-name">${escape(style.name)}</span><span class="scene-name">${escape(style.scenes[0].name)}</span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></span><span class="active-mark" aria-hidden="true"></span><span class="hub-arc" aria-hidden="true"></span></button>`,
   )
   .join("")}</nav>
 <button class="play" aria-label="Play ambient audio">${icon(false)}</button>
 <div class="cinema" aria-hidden="true"><img class="poster" alt=""><video muted playsinline preload="auto"></video><canvas class="ambient-motion" aria-hidden="true"></canvas></div>
 <div class="ambient-glow" aria-hidden="true"></div>
 <svg class="notch-blend" viewBox="0 0 60 180" aria-hidden="true"><path d="M0 0C0 24.5 .2 38.4 31.3 52.6C44.1 60.3 53 74.1 53 89.6C53 105.1 44.1 118.9 31.3 126.6C.2 141 0 155 0 180Z"/></svg>
 <button class="wake" aria-label="Return to music controls" hidden></button><div class="notice" role="status" aria-live="polite"></div></main>`;
configureContours(() => config.notch);
const room = document.querySelector<HTMLElement>(".room")!;
const pads = [...document.querySelectorAll<HTMLButtonElement>(".pad")];
const playButton = document.querySelector<HTMLButtonElement>(".play")!;
const cinema = document.querySelector<HTMLElement>(".cinema")!;
const poster = document.querySelector<HTMLImageElement>(".poster")!;
export const videoLoop = new VideoLoop(cinema);
const motion = new AmbientMotion(
  document.querySelector<HTMLCanvasElement>(".ambient-motion")!,
);
const wake = document.querySelector<HTMLButtonElement>(".wake")!;
let previousFocus: HTMLElement | null = null;
const currentMode = () => mode;
function setMode(next: typeof mode) {
  mode = next;
  room.dataset.mode = next;
}
function armIdle() {
  clearTimeout(idleTimer);
  if (playing && mode === "controls" && !document.hidden)
    idleTimer = window.setTimeout(enterAmbient, 15000);
}
function tileTransform() {
  const tile = pads[active].getBoundingClientRect(),
    rect = room.getBoundingClientRect();
  return `translate(${tile.left - rect.left}px,${tile.top - rect.top}px) scale(${tile.width / rect.width},${tile.height / rect.height})`;
}
function prepareMedia() {
  const generation = ++mediaGeneration;
  mediaReady = false;
  motion.pause();
  cinema.classList.remove("video-ready", "motion-ready");
  const scene = styles[active].scenes[variants[active]];
  void (async () => {
    const cover = await resolveMedia(scene.poster);
    if (generation !== mediaGeneration) return;
    poster.src = cover;
    const video = scene.video ? await resolveMedia(scene.video) : undefined;
    if (generation !== mediaGeneration) return;
    cinema.classList.toggle("photo-only", !video);
    try {
      await videoLoop.load(video);
    } catch {
      if (generation === mediaGeneration) {
        cinema.classList.add("photo-only");
        document.querySelector(".notice")!.textContent =
          "Video could not load. Moving light background is active.";
      }
    }
    if (generation === mediaGeneration) mediaReady = true;
  })().catch(() => {
    if (generation === mediaGeneration) {
      mediaReady = true;
      cinema.classList.add("photo-only");
    }
  });
}
async function enterAmbient() {
  if (!playing || mode !== "controls" || document.hidden || settings.openNow)
    return;
  if (!mediaReady) {
    idleTimer = window.setTimeout(enterAmbient, 1000);
    return;
  }
  previousFocus = document.activeElement as HTMLElement;
  setMode("entering");
  wake.hidden = false;
  pads.forEach((pad) => (pad.tabIndex = -1));
  playButton.tabIndex = -1;
  cinema.style.transition = "none";
  cinema.style.transform = tileTransform();
  cinema.style.opacity = "1";
  cinema.style.borderRadius = "42px";
  cinema.getBoundingClientRect();
  cinema.style.transition = "";
  requestAnimationFrame(() => {
    if (mode !== "entering") return;
    cinema.style.transform = "translate(0px,0px) scale(1,1)";
    cinema.style.borderRadius = "0px";
  });
  try {
    if (!cinema.classList.contains("photo-only")) await videoLoop.play();
  } catch {
    cinema.classList.add("photo-only");
  }
  if (cinema.classList.contains("photo-only")) {
    cinema.classList.add("motion-ready");
    motion.play(styles[active].color);
  }
  if (currentMode() !== "entering") return;
  clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => {
    setMode("ambient");
    wake.focus({ preventScroll: true });
  }, duration());
}
function exitAmbient() {
  if (mode === "controls" || mode === "exiting") return;
  clearTimeout(transitionTimer);
  setMode("exiting");
  // Retarget from the current transform, including an interrupted entrance.
  cinema.style.transform = tileTransform();
  cinema.style.borderRadius = "42px";
  videoLoop.fadeToPoster();
  transitionTimer = window.setTimeout(() => {
    cinema.style.opacity = "0";
    videoLoop.pause();
    motion.pause();
    setMode("controls");
    wake.hidden = true;
    pads.forEach((pad) => (pad.tabIndex = 0));
    playButton.tabIndex = 0;
    previousFocus?.focus({ preventScroll: true });
    armIdle();
  }, duration());
}
function render() {
  room.style.setProperty("--accent", styles[active].color);
  pads.forEach((pad, i) => {
    pad.style.setProperty("--color", styles[i].color);
    pad.querySelector(".style-name")!.textContent = styles[i].name;
    pad.setAttribute("aria-label", styles[i].name);
    pad.setAttribute("aria-pressed", String(i === active));
    pad.querySelector(".scene-name")!.textContent =
      styles[i].scenes[variants[i]].name;
    pad
      .querySelectorAll(".dots i")
      .forEach((dot, n) => dot.classList.toggle("selected", n === variants[i]));
  });
  playButton.innerHTML = icon(playing);
  playButton.setAttribute(
    "aria-label",
    playing ? "Pause ambient audio" : "Play ambient audio",
  );
  room.classList.toggle("playing", playing);
}
async function updateAudio() {
  const generation = ++audioGeneration;
  render();
  try {
    const scene = styles[active].scenes[variants[active]],
      source = scene.source;
    if (playing && !["library", "files"].includes(source.kind)) {
      audio.pause();
      playing = false;
      render();
      screenWake.setPlaying(false);
      clearTimeout(idleTimer);
      openProvider(source.kind, source.url, () => {
        render();
        playButton.focus();
      });
      return;
    }
    if (playing) {
      const tracks =
        source.kind === "files"
          ? await Promise.all(
              source.files.map(async (file, index) => ({
                id: file.uri,
                title: file.name,
                artist: "Imported audio",
                station: scene.station,
                file: await resolveMedia(file.uri),
                duration: 1,
                source: "Local file",
                license: "User supplied",
              })),
            )
          : undefined;
      if (generation !== audioGeneration) return;
      await audio.play(scene.station, tracks);
    } else audio.pause();
    if (generation === audioGeneration)
      document.querySelector(".notice")!.textContent = "";
  } catch (error) {
    if (generation !== audioGeneration) return;
    playing = false;
    audio.pause();
    document.querySelector(".notice")!.textContent =
      (error as Error).message + " Hold the center button to set up audio.";
    render();
  }
  if (generation === audioGeneration) {
    screenWake.setPlaying(
      settings.openNow || (playing && audio.getStatus().active),
    );
    armIdle();
  }
}
function changeImage(pad: HTMLButtonElement, src: string) {
  void resolveMedia(src)
    .then((url) => crossfadeImage(pad, url))
    .catch(console.warn);
}
audio.onError = (message) => {
  playing = false;
  screenWake.setPlaying(false);
  render();
  clearTimeout(idleTimer);
  document.querySelector(".notice")!.textContent = message;
};
pads.forEach((pad, index) =>
  pad.addEventListener("click", () => {
    if (mode !== "controls") return;
    if (index === active) {
      variants[index] = (variants[index] + 1) % 3;
      changeImage(pad, styles[index].scenes[variants[index]].poster);
    } else active = index;
    playing = true;
    prepareMedia();
    void updateAudio();
  }),
);
playButton.addEventListener("click", () => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  if (mode !== "controls" || settings.openNow) return;
  playing = !playing;
  void updateAudio();
});
wake.addEventListener("click", (event) => {
  event.stopPropagation();
  exitAmbient();
});
document.addEventListener("keydown", (event) => {
  if (settings.openNow || document.querySelector(".provider-dialog")) return;
  if (event.key === "," && mode === "controls") {
    event.preventDefault();
    settings.open();
    return;
  }
  if (mode !== "controls" && ["Escape", " ", "Enter"].includes(event.key)) {
    event.preventDefault();
    exitAmbient();
  } else if (event.code === "Space" && event.target === document.body) {
    event.preventDefault();
    playing = !playing;
    void updateAudio();
  }
});
document.addEventListener("visibilitychange", () => {
  screenWake.setPlaying(
    settings.openNow || (playing && audio.getStatus().active),
  );
  if (document.hidden) {
    clearTimeout(idleTimer);
    exitAmbient();
  } else armIdle();
});
window.addEventListener("pagehide", () => screenWake.setPlaying(false));
window.addEventListener("resize", () => {
  if (mode === "exiting") cinema.style.transform = tileTransform();
});
let resumeAfterSettings = false;
const settings = createSettings(
  () => config,
  (next) => {
    config = next;
    styles = config.cards;
    audio.reset();
    pads.forEach((pad, i) =>
      changeImage(pad, styles[i].scenes[variants[i]].poster),
    );
    render();
    prepareMedia();
    window.dispatchEvent(new Event("ambiance-config"));
  },
  () => {
    resumeAfterSettings = playing;
    playing = false;
    clearTimeout(idleTimer);
    void updateAudio();
  },
  () => {
    playing = resumeAfterSettings;
    void updateAudio();
    playButton.focus();
  },
);
let pressTimer: number | undefined,
  suppressClick = false,
  pressStart = { x: 0, y: 0 };
const cancelPress = () => clearTimeout(pressTimer);
playButton.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  suppressClick = false;
  pressStart = { x: event.clientX, y: event.clientY };
  playButton.setPointerCapture(event.pointerId);
  pressTimer = window.setTimeout(() => {
    suppressClick = true;
    settings.open();
  }, 650);
});
playButton.addEventListener("pointermove", (event) => {
  if (
    Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > 12
  )
    cancelPress();
});
playButton.addEventListener("pointerup", cancelPress);
playButton.addEventListener("pointercancel", cancelPress);
playButton.addEventListener("contextmenu", (event) => event.preventDefault());
playButton.title = "Play / pause · hold for settings";
render();
prepareMedia();
pads.forEach((pad, i) =>
  changeImage(pad, styles[i].scenes[variants[i]].poster),
);

// Read-only diagnostics for acceptance checks on this private installed player.
Object.defineProperty(window, "ambientDiagnostics", {
  value: () => ({
    audio: audio.getStatus(),
    screenAwake: screenWake.active,
    mode,
    scene: styles[active].scenes[variants[active]].name,
    video: videoLoop.getStatus(),
    settingsOpen: settings.openNow,
  }),
});
