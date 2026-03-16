import { describe, it, expect } from 'vitest';
import { App } from '../src/App.js';

describe('viewer smoke test', () => {
  it('App component is defined', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });
});
