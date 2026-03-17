import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createControlSlice, type ControlSlice } from '../src/store/controlSlice.js';

describe('controlSlice', () => {
  function makeStore() {
    return create<ControlSlice>()(createControlSlice);
  }

  it('initializes with all 6 providers enabled', () => {
    const store = makeStore();
    const { enabledProviders } = store.getState();
    expect(enabledProviders.has('musicbrainz')).toBe(true);
    expect(enabledProviders.has('listenbrainz')).toBe(true);
    expect(enabledProviders.has('lastfm')).toBe(true);
    expect(enabledProviders.has('deezer')).toBe(true);
    expect(enabledProviders.has('tastedive')).toBe(true);
    expect(enabledProviders.has('spotify')).toBe(true);
    expect(enabledProviders.size).toBe(6);
  });

  it('toggleProvider removes provider from set', () => {
    const store = makeStore();
    store.getState().toggleProvider('lastfm');
    expect(store.getState().enabledProviders.has('lastfm')).toBe(false);
  });

  it('toggleProvider re-adds provider when toggled again', () => {
    const store = makeStore();
    store.getState().toggleProvider('lastfm');
    store.getState().toggleProvider('lastfm');
    expect(store.getState().enabledProviders.has('lastfm')).toBe(true);
  });

  it('setMaxDepth updates maxDepth', () => {
    const store = makeStore();
    store.getState().setMaxDepth(5);
    expect(store.getState().maxDepth).toBe(5);
  });

  it('setNodeLimit updates nodeLimit', () => {
    const store = makeStore();
    store.getState().setNodeLimit(50);
    expect(store.getState().nodeLimit).toBe(50);
  });

  it('setLayoutMode updates layoutMode', () => {
    const store = makeStore();
    store.getState().setLayoutMode('radial');
    expect(store.getState().layoutMode).toBe('radial');
  });

  it('setSidebarExpanded updates isSidebarExpanded', () => {
    const store = makeStore();
    store.getState().setSidebarExpanded(true);
    expect(store.getState().isSidebarExpanded).toBe(true);
  });

  it('resetControls resets all fields to defaults', () => {
    const store = makeStore();
    store.getState().setMaxDepth(10);
    store.getState().setNodeLimit(50);
    store.getState().setLayoutMode('radial');
    store.getState().toggleProvider('lastfm');
    store.getState().setSidebarExpanded(true);
    store.getState().resetControls();

    const state = store.getState();
    expect(state.maxDepth).toBe(3);
    expect(state.nodeLimit).toBe(150);
    expect(state.layoutMode).toBe('force');
    expect(state.isSidebarExpanded).toBe(false);
    expect(state.enabledProviders.size).toBe(6);
    expect(state.enabledProviders.has('lastfm')).toBe(true);
  });

  it('setProviderStatus updates providerStatus record', () => {
    const store = makeStore();
    store.getState().setProviderStatus('spotify', 'rate-limited');
    expect(store.getState().providerStatus['spotify']).toBe('rate-limited');
  });

  it('setProviderFetching updates providerIsFetching record', () => {
    const store = makeStore();
    store.getState().setProviderFetching('deezer', true);
    expect(store.getState().providerIsFetching['deezer']).toBe(true);
  });

  it('setProviderCooldown updates providerCooldownEndsAt record', () => {
    const store = makeStore();
    const endsAt = Date.now() + 5000;
    store.getState().setProviderCooldown('lastfm', endsAt);
    expect(store.getState().providerCooldownEndsAt['lastfm']).toBe(endsAt);
  });
});
