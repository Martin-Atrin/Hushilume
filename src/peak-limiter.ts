// Linked stereo look-ahead limiter. Constant loudness gain remains outside this stage.
export class PeakLimiter {
  private buffers: Float32Array[];
  private peaks: Float64Array;
  private positions: Float64Array;
  private head = 0;
  private tail = 0;
  private clock = 0;
  private gain = 1;
  private release: number;
  readonly delay: number;
  private channels: number;
  private ceiling: number;
  constructor(rate: number, channels = 2, ceiling = 0.95) {
    this.channels = channels;
    this.ceiling = ceiling;
    this.delay = Math.ceil(rate * 0.005);
    this.buffers = Array.from(
      { length: channels },
      () => new Float32Array(this.delay + 1),
    );
    this.peaks = new Float64Array(this.delay + 2);
    this.positions = new Float64Array(this.delay + 2);
    this.release = Math.exp(-1 / (rate * 0.15));
  }
  process(input: Float32Array[], output: Float32Array[]) {
    const capacity = this.peaks.length;
    for (let frame = 0; frame < output[0].length; frame++, this.clock++) {
      const write = this.clock % (this.delay + 1);
      let peak = 0;
      for (let channel = 0; channel < this.channels; channel++) {
        const sample = input[channel]?.[frame] ?? input[0]?.[frame] ?? 0;
        this.buffers[channel][write] = sample;
        peak = Math.max(peak, Math.abs(sample));
      }
      while (
        this.head < this.tail &&
        this.positions[this.head % capacity] < this.clock - this.delay
      )
        this.head++;
      while (
        this.head < this.tail &&
        this.peaks[(this.tail - 1) % capacity] <= peak
      )
        this.tail--;
      this.peaks[this.tail % capacity] = peak;
      this.positions[this.tail % capacity] = this.clock;
      this.tail++;
      const maximum = this.peaks[this.head % capacity];
      const required = maximum > this.ceiling ? this.ceiling / maximum : 1;
      this.gain =
        required < this.gain
          ? this.gain +
            (required - this.gain) /
              Math.max(
                1,
                this.positions[this.head % capacity] -
                  (this.clock - this.delay),
              )
          : required + this.release * (this.gain - required);
      const read = (this.clock + 1) % (this.delay + 1);
      // Anticipate peaks smoothly; a linked instantaneous guard covers any
      // smaller, earlier transient hidden behind the window's largest peak.
      let outgoingPeak = 0;
      for (const buffer of this.buffers)
        outgoingPeak = Math.max(outgoingPeak, Math.abs(buffer[read]));
      const applied =
        outgoingPeak > this.ceiling
          ? Math.min(this.gain, this.ceiling / outgoingPeak)
          : this.gain;
      for (let channel = 0; channel < output.length; channel++)
        output[channel][frame] =
          this.clock < this.delay
            ? 0
            : this.buffers[Math.min(channel, this.channels - 1)][read] *
              applied;
    }
  }
}
