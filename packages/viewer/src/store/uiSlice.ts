import type { StateCreator } from 'zustand';
import type { ForceNode } from '../types/graph.js';

export interface UiSlice {
  selectedNode: ForceNode | null;
  isPanelOpen: boolean;
  expandingMbid: string | null;
  expansionStartTime: number | null;
  warnings: Array<{ provider: string; error: string }>;
  selectNode: (node: ForceNode | null) => void;
  setExpandingMbid: (mbid: string | null) => void;
  addWarnings: (warnings: Array<{ provider: string; error: string }>) => void;
  clearWarnings: () => void;
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  selectedNode: null,
  isPanelOpen: false,
  expandingMbid: null,
  expansionStartTime: null,
  warnings: [],
  selectNode: (node) => set({
    selectedNode: node,
    isPanelOpen: node !== null,
  }),
  setExpandingMbid: (mbid) => set({
    expandingMbid: mbid,
    expansionStartTime: mbid !== null ? Date.now() : null,
  }),
  addWarnings: (warnings) => set((state) => ({
    warnings: [...state.warnings, ...warnings],
  })),
  clearWarnings: () => set({ warnings: [] }),
});
