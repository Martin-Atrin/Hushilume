const generations = new WeakMap<HTMLElement, number>();

export async function crossfadeImage(pad: HTMLElement, src: string) {
  const generation = (generations.get(pad) ?? 0) + 1;
  generations.set(pad, generation);
  const image = new Image();
  image.alt = "";
  image.draggable = false;
  image.src = src;
  image.style.opacity = "0";
  try {
    await image.decode();
  } catch {
    return;
  }
  if (generations.get(pad) !== generation) return;

  const previous = [...pad.querySelectorAll("img")];
  // Equal z-index images paint in DOM order. The incoming image must be on top.
  previous[previous.length - 1].after(image);
  // Commit opacity zero before starting the transition, including cached images.
  getComputedStyle(image).opacity;
  requestAnimationFrame(() => {
    image.style.opacity = "1";
  });
  const cleanup = () => {
    if (generations.get(pad) !== generation) return;
    previous.forEach((node) => node.remove());
  };
  image.addEventListener(
    "transitionend",
    (event) => {
      if (event.propertyName === "opacity") cleanup();
    },
    { once: true },
  );
  window.setTimeout(cleanup, 1800);
}
