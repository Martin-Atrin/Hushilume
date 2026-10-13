import { PeakLimiter } from "./peak-limiter";
declare const sampleRate: number;
declare class AudioWorkletProcessor {
  constructor();
}
declare function registerProcessor(
  name: string,
  processor: typeof AudioWorkletProcessor,
): void;
class HushilumeLimiter extends AudioWorkletProcessor {
  private limiter = new PeakLimiter(sampleRate);
  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    if (outputs[0]?.length) this.limiter.process(inputs[0] ?? [], outputs[0]);
    return true;
  }
}
registerProcessor("hushilume-limiter", HushilumeLimiter);
