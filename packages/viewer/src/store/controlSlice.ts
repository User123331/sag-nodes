import type { StateCreator } from 'zustand';
import type { ProviderId } from '@similar-artists-graph/engine';

const ALL_PROVIDERS: ProviderId[] = ['musicbrainz', 'listenbrainz', 'lastfm', 'deezer', 'tastedive', 'spotify'];

export interface ControlSlice {
  enabledProviders: Set<ProviderId>;
  providerStatus: Record<string, 'active' | 'rate-limited' | 'erroring' | 'disabled'>;
  providerCooldownEndsAt: Record<string, number | null>;
  providerIsFetching: Record<string, boolean>;
  maxDepth: number;
  nodeLimit: number;
  layoutMode: 'force' | 'radial' | 'cluster';
  isSidebarExpanded: boolean;
  toggleProvider: (id: ProviderId) => void;
  setProviderStatus: (id: ProviderId, status: 'active' | 'rate-limited' | 'erroring') => void;
  setProviderFetching: (id: ProviderId, v: boolean) => void;
  setProviderCooldown: (id: ProviderId, endsAt: number | null) => void;
  setMaxDepth: (n: number) => void;
  setNodeLimit: (n: number) => void;
  setLayoutMode: (mode: 'force' | 'radial' | 'cluster') => void;
  setSidebarExpanded: (v: boolean) => void;
  resetControls: () => void;
}

export const createControlSlice: StateCreator<ControlSlice> = (set) => ({
  enabledProviders: new Set(ALL_PROVIDERS),
  providerStatus: {},
  providerCooldownEndsAt: {},
  providerIsFetching: {},
  maxDepth: 3,
  nodeLimit: 150,
  layoutMode: 'force',
  isSidebarExpanded: false,

  toggleProvider: (id) => set((state) => {
    const next = new Set(state.enabledProviders);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return { enabledProviders: next };
  }),

  setProviderStatus: (id, status) => set((state) => ({
    providerStatus: { ...state.providerStatus, [id]: status },
  })),

  setProviderFetching: (id, v) => set((state) => ({
    providerIsFetching: { ...state.providerIsFetching, [id]: v },
  })),

  setProviderCooldown: (id, endsAt) => set((state) => ({
    providerCooldownEndsAt: { ...state.providerCooldownEndsAt, [id]: endsAt },
  })),

  setMaxDepth: (n) => set({ maxDepth: n }),
  setNodeLimit: (n) => set({ nodeLimit: n }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setSidebarExpanded: (v) => set({ isSidebarExpanded: v }),

  resetControls: () => set({
    enabledProviders: new Set(ALL_PROVIDERS),
    providerCooldownEndsAt: {},
    maxDepth: 3,
    nodeLimit: 150,
    layoutMode: 'force',
    isSidebarExpanded: false,
  }),
});
