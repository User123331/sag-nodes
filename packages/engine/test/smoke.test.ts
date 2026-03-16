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
  ArtistGraph,
  GraphBuilder,
  createEngine,
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

  it('exports graph classes', () => {
    expect(ArtistGraph).toBeDefined();
    expect(GraphBuilder).toBeDefined();
  });

  it('exports createEngine factory', () => {
    expect(createEngine).toBeDefined();
    expect(typeof createEngine).toBe('function');
  });

  it('createEngine() returns an object with explore and expand methods', () => {
    const engine = createEngine();
    expect(typeof engine.explore).toBe('function');
    expect(typeof engine.expand).toBe('function');
  });
});
