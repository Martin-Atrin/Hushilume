// Leave enough material for a useful listening interval and a full crossfade.
export function randomStart(
  duration: number,
  previous?: number,
  random = Math.random,
): number {
  if (!Number.isFinite(duration) || duration < 25) return 0;
  const reserve = Math.min(90, Math.max(15, duration * 0.15));
  const lower = duration > 90 ? 8 : 0;
  const upper = Math.max(lower, duration - reserve);
  let position = lower + random() * (upper - lower);
  if (
    previous !== undefined &&
    upper - lower > 40 &&
    Math.abs(position - previous) < 20
  ) {
    position =
      lower + ((position - lower + (upper - lower) / 2) % (upper - lower));
  }
  return position;
}
