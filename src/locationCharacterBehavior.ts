// Small, testable timing functions for the architecture-derived location character.
// Ambient animation must remain subtle and cannot be required to understand the map.
export const BLINK_INTRO_DELAY_MS = 1_100
export const BLINK_DURATION_MS = 230
export const BLINK_MIN_INTERVAL_MS = 10_000
export const BLINK_RANDOM_RANGE_MS = 9_000

const smooth = (t: number) => t * t * (3 - 2 * t)

/** Quick close, gentler opening; zero at rest so no lingering eye deformation. */
export const blinkAmount = (progress: number): number => {
  const t = Math.max(0, Math.min(1, progress))
  return 0.95 * (t < 0.38
    ? smooth(t / 0.38)
    : 1 - smooth((t - 0.38) / 0.62))
}
