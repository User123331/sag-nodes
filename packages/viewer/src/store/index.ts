import { create } from 'zustand';
import { createGraphSlice, type GraphSlice } from './graphSlice.js';
import { createSearchSlice, type SearchSlice } from './searchSlice.js';
import { createUiSlice, type UiSlice } from './uiSlice.js';
import { createEngineSlice, type EngineSlice } from './engineSlice.js';
import { createControlSlice, type ControlSlice } from './controlSlice.js';

export type StoreState = GraphSlice & SearchSlice & UiSlice & EngineSlice & ControlSlice;

export const useGraphStore = create<StoreState>()((...a) => ({
  ...createGraphSlice(...a),
  ...createSearchSlice(...a),
  ...createUiSlice(...a),
  ...createEngineSlice(...a),
  ...createControlSlice(...a),
}));
