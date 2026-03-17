import type { StateCreator } from 'zustand';
import type { ForceNode } from '../types/graph.js';

export interface UiSlice {
  selectedNode: ForceNode | null;
  isPanelOpen: boolean;
  expandingMbid: string | null;
  expansionStartTime: number | null;
  reheatCounter: number;
  warnings: Array<{ provider: string; error: string }>;
  focusedNodeMbid: string | null;
  isShortcutOverlayOpen: boolean;
  selectNode: (node: ForceNode | null) => void;
  setExpandingMbid: (mbid: string | null) => void;
  triggerReheat: () => void;
  addWarnings: (warnings: Array<{ provider: string; error: string }>) => void;
  clearWarnings: () => void;
  setFocusedNode: (mbid: string | null) => void;
  toggleShortcutOverlay: () => void;
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  selectedNode: null,
  isPanelOpen: false,
  expandingMbid: null,
  expansionStartTime: null,
  reheatCounter: 0,
  warnings: [],
  focusedNodeMbid: null,
  isShortcutOverlayOpen: false,
  selectNode: (node) => set({
    selectedNode: node,
    isPanelOpen: node !== null,
  }),
  setExpandingMbid: (mbid) => set({
    expandingMbid: mbid,
    expansionStartTime: mbid !== null ? Date.now() : null,
  }),
  triggerReheat: () => set((state) => ({ reheatCounter: state.reheatCounter + 1 })),
  addWarnings: (warnings) => set((state) => ({
    warnings: [...state.warnings, ...warnings],
  })),
  clearWarnings: () => set({ warnings: [] }),
  setFocusedNode: (mbid) => set({ focusedNodeMbid: mbid }),
  toggleShortcutOverlay: () => set((state) => ({ isShortcutOverlayOpen: !state.isShortcutOverlayOpen })),
});
