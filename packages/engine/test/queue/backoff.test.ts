import { describe, it, expect } from 'vitest';
import { calculateBackoff } from '../../src/queue/backoff.js';

describe('calculateBackoff', () => {
  const fixedRandom = () => 0.5; // Produces 0 jitter (midpoint of +-20%)

  it('returns ~1s for attempt 0', () => {
    const delay = calculateBackoff(0, { maxDelayMs: 30000 }, fixedRandom);
    expect(delay).toBe(1000);
  });

  it('returns ~2s for attempt 1', () => {
    const delay = calculateBackoff(1, { maxDelayMs: 30000 }, fixedRandom);
    expect(delay).toBe(2000);
  });

  it('returns ~4s for attempt 2', () => {
    const delay = calculateBackoff(2, { maxDelayMs: 30000 }, fixedRandom);
    expect(delay).toBe(4000);
  });

  it('caps at maxDelayMs', () => {
    const delay = calculateBackoff(10, { maxDelayMs: 30000 }, fixedRandom);
    expect(delay).toBeLessThanOrEqual(30000);
  });

  it('adds jitter with random > 0.5', () => {
    const highRandom = () => 0.9;
    const delay = calculateBackoff(0, { maxDelayMs: 30000 }, highRandom);
    // base=1000, jitter = 0.9*400 - 200 = 160, total = 1160
    expect(delay).toBeGreaterThan(1000);
    expect(delay).toBeLessThanOrEqual(1200);
  });

  it('subtracts jitter with random < 0.5', () => {
    const lowRandom = () => 0.1;
    const delay = calculateBackoff(0, { maxDelayMs: 30000 }, lowRandom);
    // base=1000, jitter = 0.1*400 - 200 = -160, total = 840
    expect(delay).toBeLessThan(1000);
    expect(delay).toBeGreaterThanOrEqual(800);
  });

  it('never returns negative', () => {
    const zeroRandom = () => 0;
    const delay = calculateBackoff(0, { maxDelayMs: 30000 }, zeroRandom);
    expect(delay).toBeGreaterThanOrEqual(0);
  });
});
