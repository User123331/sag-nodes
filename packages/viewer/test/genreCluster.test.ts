import { describe, it, expect } from 'vitest';
import { genreColor, NO_GENRE_COLOR } from '../src/utils/genreCluster.js';

describe('genreColor', () => {
  it('returns NO_GENRE_COLOR for empty array', () => {
    expect(genreColor([])).toBe(NO_GENRE_COLOR);
  });

  it('returns valid HSL string for {name, count} tag', () => {
    const color = genreColor([{ name: 'rock', count: 10 }]);
    expect(color).toMatch(/^hsl\(\d+, 70%, 65%\)$/);
  });

  it('is deterministic — same tag always returns same color', () => {
    const a = genreColor([{ name: 'rock', count: 10 }]);
    const b = genreColor([{ name: 'rock', count: 10 }]);
    expect(a).toBe(b);
  });

  it('different tags return different hues', () => {
    const rock = genreColor([{ name: 'rock', count: 10 }]);
    const jazz = genreColor([{ name: 'jazz', count: 5 }]);
    expect(rock).not.toBe(jazz);
  });

  it('accepts string[] input (Spotify genre shape)', () => {
    const color = genreColor(['electronic']);
    expect(color).toMatch(/^hsl\(\d+, 70%, 65%\)$/);
  });

  it('is case-insensitive', () => {
    const upper = genreColor([{ name: 'Rock', count: 10 }]);
    const lower = genreColor([{ name: 'rock', count: 10 }]);
    expect(upper).toBe(lower);
  });

  it('exports NO_GENRE_COLOR as #4a4a4a', () => {
    expect(NO_GENRE_COLOR).toBe('#4a4a4a');
  });
});
