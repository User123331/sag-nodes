import type { StateCreator } from 'zustand';
import type { ArtistSummary } from '@similar-artists-graph/engine';

export interface SearchSlice {
  query: string;
  results: ArtistSummary[];
  isSearching: boolean;
  selectedArtist: ArtistSummary | null;
  setQuery: (query: string) => void;
  setResults: (results: ArtistSummary[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  setSelectedArtist: (artist: ArtistSummary | null) => void;
  clearSearch: () => void;
}

export const createSearchSlice: StateCreator<SearchSlice> = (set) => ({
  query: '',
  results: [],
  isSearching: false,
  selectedArtist: null,
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results, isSearching: false }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setSelectedArtist: (artist) => set({ selectedArtist: artist, results: [], query: artist?.name ?? '' }),
  clearSearch: () => set({ query: '', results: [], isSearching: false, selectedArtist: null }),
});
