// Two muted video elements overlap at loop boundaries. Only the active scene is decoded.
export class VideoLoop {
  private front = 0;
  private transitioning = false;
  private active = false;
  private generation = 0;
  private timer?: number;
  private cleanup?: number;
  private elements: HTMLVideoElement[];
  constructor(private container: HTMLElement) {
    this.elements = [
      container.querySelector("video")!,
      document.createElement("video"),
    ];
    container.append(this.elements[1]);
    for (const element of this.elements) {
      element.muted = true;
      element.playsInline = true;
      element.preload = "auto";
      element.addEventListener("timeupdate", () => this.tick());
    }
  }
  async load(src?: string) {
    this.pause();
    const generation = ++this.generation;
    this.front = 0;
    for (const element of this.elements) {
      element.classList.remove("on");
      element.removeAttribute("src");
      element.load();
    }
    if (!src) return;
    await Promise.all(
      this.elements.map(
        (element) =>
          new Promise<void>((resolve, reject) => {
            const done = (error?: Error) => {
              clearTimeout(timeout);
              element.removeEventListener("loadeddata", ready);
              element.removeEventListener("error", failed);
              if (generation !== this.generation) {
                resolve();
                return;
              }
              error ? reject(error) : resolve();
            };
            const ready = () => done();
            const failed = () => done(Error("Video is unavailable."));
            const timeout = window.setTimeout(failed, 10000);
            element.addEventListener("loadeddata", ready, { once: true });
            element.addEventListener("error", failed, { once: true });
            element.src = src;
            element.playbackRate = 0.65;
            element.load();
          }),
      ),
    );
  }
  async play() {
    if (!this.elements[0].getAttribute("src")) return;
    this.active = true;
    const generation = this.generation;
    const front = this.elements[this.front];
    await front.play();
    if (generation !== this.generation || !this.active) return;
    front.classList.add("on");
    this.container.classList.add("video-ready");
    clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), 150);
  }
  fadeToPoster() {
    this.container.classList.remove("video-ready");
  }
  pause() {
    this.active = false;
    clearInterval(this.timer);
    clearTimeout(this.cleanup);
    this.transitioning = false;
    for (const element of this.elements ?? []) element.pause();
  }
  private tick() {
    if (!this.active || this.transitioning) return;
    const old = this.elements[this.front];
    if (!Number.isFinite(old.duration) || old.duration - old.currentTime > 1.3)
      return;
    this.transitioning = true;
    const generation = this.generation;
    const nextIndex = 1 - this.front,
      next = this.elements[nextIndex];
    next.currentTime = 0;
    void next
      .play()
      .then(() => {
        if (!this.active || generation !== this.generation) {
          next.pause();
          return;
        }
        next.classList.add("on");
        old.classList.remove("on");
        this.front = nextIndex;
        this.cleanup = window.setTimeout(() => {
          old.pause();
          old.currentTime = 0;
          this.transitioning = false;
        }, 1600);
      })
      .catch(() => {
        this.transitioning = false;
      });
  }
  getStatus() {
    return {
      active: this.active,
      front: this.front,
      transitioning: this.transitioning,
      videos: this.elements.map((v) => ({
        src: v.getAttribute("src"),
        time: v.currentTime,
        paused: v.paused,
        ready: v.readyState,
        on: v.classList.contains("on"),
      })),
    };
  }
  seekNearEnd() {
    const video = this.elements[this.front];
    if (Number.isFinite(video.duration))
      video.currentTime = video.duration - 1.4;
  }
}
