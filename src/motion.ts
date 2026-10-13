// Lightweight original moving light fields. They remain available offline when no video is set.
export class AmbientMotion {
  private frame = 0;
  private running = false;
  private color = "#9acbdc";
  constructor(private canvas: HTMLCanvasElement) {}
  play(color: string) {
    this.color = color;
    if (this.running) return;
    this.running = true;
    this.draw(performance.now());
  }
  pause() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }
  private draw = (time: number) => {
    if (!this.running) return;
    const width = Math.min(1200, this.canvas.clientWidth),
      height = Math.round(
        (width * this.canvas.clientHeight) /
          Math.max(1, this.canvas.clientWidth),
      );
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);
    const t = time / 24000;
    for (let i = 0; i < 5; i++) {
      const x = width * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.8)),
        y = height * (0.5 + 0.6 * Math.cos(t * 0.5 + i * 2.1));
      const radius = Math.max(width, height) * 0.65;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, this.color + "65");
      gradient.addColorStop(0.4, this.color + "22");
      gradient.addColorStop(1, this.color + "00");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    this.frame = requestAnimationFrame(this.draw);
  };
}
