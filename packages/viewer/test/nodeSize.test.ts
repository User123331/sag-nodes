import { describe, it, expect } from 'vitest';
import { nodeVal, nodeRadius } from '../src/utils/nodeSize.js';

describe('nodeVal', () => {
  it('returns 1 for undefined nb_fan', () => {
    expect(nodeVal(undefined)).toBe(1);
  });

  it('returns 1 for nb_fan = 0', () => {
    expect(nodeVal(0)).toBe(1);
  });

  it('returns 1 for negative nb_fan', () => {
    expect(nodeVal(-5)).toBe(1);
  });

  it('returns Math.log10(1001) for nb_fan = 1000', () => {
    expect(nodeVal(1000)).toBeCloseTo(Math.log10(1001), 10);
  });

  it('returns Math.log10(1000001) for nb_fan = 1000000', () => {
    expect(nodeVal(1000000)).toBeCloseTo(Math.log10(1000001), 10);
  });
});

describe('nodeRadius', () => {
  it('returns BASE_RADIUS * sqrt(1) = 4 for undefined nb_fan', () => {
    expect(nodeRadius(undefined)).toBe(4);
  });

  it('returns a positive number greater than 4 for nb_fan = 10000', () => {
    const r = nodeRadius(10000);
    expect(r).toBeGreaterThan(4);
  });
});
