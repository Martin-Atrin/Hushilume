import test from "node:test";
import assert from "node:assert/strict";
import { PeakLimiter } from "../src/peak-limiter.ts";
import { normalizationGain } from "../src/loudness.ts";
test("measured gains follow decibels and unmeasured or invalid tracks remain unchanged", () => {
  assert.equal(normalizationGain(), 1);
  assert.ok(
    Math.abs(
      normalizationGain({
        gainDb: 6,
        integratedLufs: -24,
        truePeakDb: -8,
        targetLufs: -18,
      }) - 1.9952623,
    ) < 1e-6,
  );
  assert.equal(
    normalizationGain({
      gainDb: NaN,
      integratedLufs: -24,
      truePeakDb: -8,
      targetLufs: -18,
    }),
    1,
  );
  assert.equal(
    normalizationGain({
      gainDb: 50,
      integratedLufs: -70,
      truePeakDb: -8,
      targetLufs: -20,
    }),
    1,
  );
});
test("quiet audio retains its samples and dynamics after the fixed look-ahead delay", () => {
  const limiter = new PeakLimiter(48000);
  const input = Float32Array.from(
    { length: 4096 },
    (_, i) => Math.sin(i * 0.13) * 0.2,
  );
  const output = new Float32Array(input.length);
  limiter.process([input], [output]);
  for (let i = limiter.delay; i < input.length; i++)
    assert.equal(output[i], input[i - limiter.delay]);
});
test("large stereo transients stay below the ceiling across processing blocks and silence", () => {
  const limiter = new PeakLimiter(48000);
  let maximum = 0,
    nonzero = 0;
  for (let block = 0; block < 200; block++) {
    const left = Float32Array.from({ length: 128 }, (_, i) => {
      const t = block * 128 + i;
      return t % 397 === 0 ? 12 : Math.sin(t * 0.1) * 0.3;
    });
    const right = Float32Array.from(left, (v) => v * 0.5);
    const out = [new Float32Array(128), new Float32Array(128)];
    limiter.process(block < 150 ? [left, right] : [], out);
    for (let i = 0; i < 128; i++) {
      maximum = Math.max(maximum, Math.abs(out[0][i]));
      if (out[0][i] !== 0) nonzero++;
      assert.ok(Math.abs(out[1][i] - out[0][i] * 0.5) < 1e-6);
    }
  }
  assert.ok(maximum <= 0.950001);
  assert.ok(maximum > 0.9);
  assert.ok(nonzero > 10000);
});
