import { describe, it, expect } from 'vitest';
import {
  ENGINE_VERSION,
  MusicBrainzProvider,
  ListenBrainzProvider,
  LastFmProvider,
  DeezerProvider,
  TasteDiveProvider,
  SpotifyProvider,
  EntityResolver,
} from '../src/index.js';

describe('engine smoke test', () => {
  it('exports ENGINE_VERSION', () => {
    expect(ENGINE_VERSION).toBe('0.1.0');
  });

  it('exports all provider classes', () => {
    expect(MusicBrainzProvider).toBeDefined();
    expect(ListenBrainzProvider).toBeDefined();
    expect(LastFmProvider).toBeDefined();
    expect(DeezerProvider).toBeDefined();
    expect(TasteDiveProvider).toBeDefined();
    expect(SpotifyProvider).toBeDefined();
  });

  it('exports EntityResolver', () => {
    expect(EntityResolver).toBeDefined();
  });
});
