/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation between a and b by t (0..1) */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Fractional part of a number (always positive) */
export function fract(x: number): number {
  return x - Math.floor(x);
}

// Animation duration constants (ms)
export const BLOOM_DURATION_MS = 400;
export const EDGE_GROW_DURATION_MS = 400;
export const RIPPLE_DURATION_MS = 600;
export const RIPPLE_MAX_RADIUS = 80;
export const PARTICLE_RADIUS = 0.25;
export const PARTICLE_SKIP_SCALE = 0.15;
