import { describe, it, expect } from 'vitest';
import { schemeTableau10 } from 'd3-scale-chromatic';
import { tagToFamily, genreColor, GENRE_FAMILIES } from '../src/utils/genreCluster.js';

describe('tagToFamily', () => {
  it("returns 'rock' for ['rock']", () => {
    expect(tagToFamily(['rock'])).toBe('rock');
  });

  it("returns 'electronic' for ['techno', 'ambient']", () => {
    expect(tagToFamily(['techno', 'ambient'])).toBe('electronic');
  });

  it("returns 'other' for unknown tag", () => {
    expect(tagToFamily(['unknown-tag'])).toBe('other');
  });

  it("returns 'other' for empty array", () => {
    expect(tagToFamily([])).toBe('other');
  });
});

describe('genreColor', () => {
  it("returns schemeTableau10[0] for ['rock']", () => {
    expect(genreColor(['rock'])).toBe(schemeTableau10[0]);
  });

  it("returns schemeTableau10[8] for ['hip-hop']", () => {
    expect(genreColor(['hip-hop'])).toBe(schemeTableau10[8]);
  });

  it('all 10 genre families map to distinct schemeTableau10 colors', () => {
    const colors = GENRE_FAMILIES.map(family => genreColor([family]));
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(GENRE_FAMILIES.length);
  });
});
