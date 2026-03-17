import { describe, it, expect } from 'vitest';
import { clamp, lerp, fract, BLOOM_DURATION_MS, RIPPLE_DURATION_MS } from '../src/utils/animationMath.js';

describe('animationMath', () => {
  describe('clamp', () => {
    it('returns value when within range', () => {
      expect(clamp(0.5, 0, 1)).toBe(0.5);
    });
    it('clamps to min', () => {
      expect(clamp(-1, 0, 1)).toBe(0);
    });
    it('clamps to max', () => {
      expect(clamp(2, 0, 1)).toBe(1);
    });
  });

  describe('lerp', () => {
    it('returns a at t=0', () => {
      expect(lerp(10, 20, 0)).toBe(10);
    });
    it('returns b at t=1', () => {
      expect(lerp(10, 20, 1)).toBe(20);
    });
    it('returns midpoint at t=0.5', () => {
      expect(lerp(10, 20, 0.5)).toBe(15);
    });
  });

  describe('fract', () => {
    it('returns fractional part of positive number', () => {
      expect(fract(3.75)).toBeCloseTo(0.75);
    });
    it('returns 0 for integer', () => {
      expect(fract(5)).toBe(0);
    });
    it('returns positive fractional for negative number', () => {
      expect(fract(-0.25)).toBeCloseTo(0.75);
    });
  });

  describe('constants', () => {
    it('BLOOM_DURATION_MS is 400', () => {
      expect(BLOOM_DURATION_MS).toBe(400);
    });
    it('RIPPLE_DURATION_MS is 600', () => {
      expect(RIPPLE_DURATION_MS).toBe(600);
    });
  });
});
