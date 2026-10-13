export type Loudness = {
  integratedLufs: number;
  truePeakDb: number;
  gainDb: number;
  targetLufs: number;
};
export function normalizationGain(value?: Loudness): number {
  if (
    !value ||
    ![
      value.gainDb,
      value.integratedLufs,
      value.truePeakDb,
      value.targetLufs,
    ].every(Number.isFinite)
  )
    return 1;
  // Reject corrupt or unbounded boosts. The analysis pipeline uses this same bound.
  if (value.gainDb < -24 || value.gainDb > 24) return 1;
  return 10 ** (value.gainDb / 20);
}
