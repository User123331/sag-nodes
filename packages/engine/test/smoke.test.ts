import { describe, it, expect } from 'vitest';
import { ENGINE_VERSION } from '../src/index.js';

describe('engine smoke test', () => {
  it('exports ENGINE_VERSION', () => {
    expect(ENGINE_VERSION).toBe('0.1.0');
  });
});
