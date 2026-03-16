export interface BackoffConfig {
  readonly maxDelayMs: number;
}

/**
 * Calculate exponential backoff delay with jitter.
 * Schedule: 1s -> 2s -> 4s -> 8s... capped at maxDelayMs.
 * Jitter: +-20% randomization to avoid thundering herd.
 *
 * @param attempt - Zero-based attempt number (0 = first retry)
 * @param config - Configuration with maxDelayMs cap (default 30000)
 * @param random - Random number generator (0-1) for testing; defaults to Math.random
 * @returns Delay in milliseconds
 */
export function calculateBackoff(
  attempt: number,
  config: BackoffConfig = { maxDelayMs: 30_000 },
  random: () => number = Math.random,
): number {
  const base = Math.pow(2, attempt) * 1000; // 1000, 2000, 4000, 8000...
  const jitter = random() * base * 0.4 - base * 0.2; // +-20% of base
  return Math.min(Math.max(0, base + jitter), config.maxDelayMs);
}
