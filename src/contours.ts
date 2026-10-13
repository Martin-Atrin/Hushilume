import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import type { Notch } from "./config";
const paths = {
  teardrop:
    "M0 0C0 14 1 23 59 29C83 34 100 41 100 50C100 59 83 66 59 71C1 79 0 86 0 100Z",
  wide: "M0 0H40Q100 0 100 18V82Q100 100 40 100H0Z",
  pill: "M55 0C115 0 115 100 55 100C-5 100 -5 0 55 0Z",
  hole: "M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0Z",
};
export function configureContours(getNotch: () => Notch) {
  const room = document.querySelector<HTMLElement>(".room")!;
  const play = document.querySelector<HTMLElement>(".play")!;
  const pads = [...document.querySelectorAll<HTMLElement>(".pad")];
  const overlay = document.querySelector<SVGElement>(".notch-blend")!;
  let detected: "teardrop" | "none" = "none";
  const outlines = pads.map((pad) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("card-notch");
    svg.setAttribute("aria-hidden", "true");
    pad.append(svg);
    return svg;
  });
  const layout = () => {
    const settings = getNotch(),
      preset = settings.preset === "auto" ? detected : settings.preset;
    const roomRect = room.getBoundingClientRect();
    const hub = {
      x: roomRect.left + play.offsetLeft,
      y: roomRect.top + play.offsetTop,
      radius: play.offsetWidth / 2,
    };
    const side =
      settings.side === "auto"
        ? innerHeight > innerWidth
          ? "top"
          : screen.orientation?.angle === 270
            ? "right"
            : "left"
        : settings.side;
    const width =
      settings.preset === "auto" ? (innerHeight * 180) / 720 : settings.width;
    const depth =
      settings.preset === "auto" ? (innerHeight * 53) / 720 : settings.depth;
    const enabled = preset !== "none";
    room.classList.toggle("has-notch", enabled);
    room.classList.toggle("notch-right", side === "right");
    const path = enabled ? paths[preset] : "";
    const offset = settings.offset / 100;
    const matrix =
      side === "top"
        ? [0, depth / 100, width / 100, 0, innerWidth * offset - width / 2, 0]
        : [
            side === "right" ? -depth / 100 : depth / 100,
            0,
            0,
            width / 100,
            side === "right" ? innerWidth : 0,
            innerHeight * offset - width / 2,
          ];
    overlay.setAttribute("viewBox", `0 0 ${innerWidth} ${innerHeight}`);
    overlay.innerHTML = enabled
      ? `<path d="${path}" transform="matrix(${matrix.join(" ")})"/>`
      : "";
    for (const [index, pad] of pads.entries()) {
      const rect = pad.getBoundingClientRect();
      pad.style.setProperty("--hub-x", `${hub.x - rect.left}px`);
      pad.style.setProperty("--hub-y", `${hub.y - rect.top}px`);
      pad.style.setProperty("--hub-radius", `${hub.radius + 6}px`);
      const local = [...matrix];
      local[4] -= rect.left;
      local[5] -= rect.top;
      const shape = `<path d="${path}" transform="matrix(${local.join(" ")})" vector-effect="non-scaling-stroke"/>`;
      const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}"><mask id="cut"><rect width="100%" height="100%" fill="white"/><g fill="black" stroke="black" stroke-width="12" stroke-linejoin="round">${shape}</g></mask><rect width="100%" height="100%" fill="white" mask="url(#cut)"/></svg>`;
      pad.style.setProperty(
        "--notch-mask",
        `url("data:image/svg+xml,${encodeURIComponent(mask)}")`,
      );
      outlines[index].setAttribute(
        "viewBox",
        `0 0 ${rect.width} ${rect.height}`,
      );
      outlines[index].innerHTML = shape;
    }
  };
  new ResizeObserver(layout).observe(room);
  screen.orientation?.addEventListener("change", () =>
    requestAnimationFrame(layout),
  );
  window.addEventListener("hushilume-config", layout);
  layout();
  if (Capacitor.isNativePlatform())
    void Device.getInfo()
      .then((info) => {
        if (/mi\s*a3|laurel_sprout/i.test(info.model)) {
          detected = "teardrop";
          room.classList.add("mi-a3");
        }
        layout();
      })
      .catch(console.warn);
}
