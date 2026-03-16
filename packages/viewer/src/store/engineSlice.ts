import type { StateCreator } from 'zustand';
import { createEngine } from '@similar-artists-graph/engine';
import type { Engine, EngineConfig } from '@similar-artists-graph/engine';

export interface EngineSlice {
  engine: Engine | null;
  isExploring: boolean;
  isExpanding: boolean;
  initEngine: (config?: EngineConfig) => void;
  setIsExploring: (v: boolean) => void;
  setIsExpanding: (v: boolean) => void;
}

export const createEngineSlice: StateCreator<EngineSlice> = (set) => ({
  engine: null,
  isExploring: false,
  isExpanding: false,
  initEngine: (config) => set({ engine: createEngine({ deezerBaseUrl: '/deezer-proxy', ...config }) }),
  setIsExploring: (v) => set({ isExploring: v }),
  setIsExpanding: (v) => set({ isExpanding: v }),
});
