import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { MusicBrainzProvider, RequestQueue } from '@similar-artists-graph/engine';
import type { ArtistSummary } from '@similar-artists-graph/engine';
import { useGraphStore } from '../store/index.js';
import { useDebounce } from '../hooks/useDebounce.js';
import './SearchBar.css';

export function SearchBar() {
  const mbProviderRef = useRef<MusicBrainzProvider | null>(null);
  if (mbProviderRef.current === null) {
    mbProviderRef.current = new MusicBrainzProvider({
      fetchFn: (...args: Parameters<typeof fetch>) => fetch(...args),
      queue: new RequestQueue({ providerId: 'musicbrainz', requestsPerSecond: 5 }),
    });
  }

  const query = useGraphStore(s => s.query);
  const results = useGraphStore(s => s.results);
  const isSearching = useGraphStore(s => s.isSearching);
  const selectedArtist = useGraphStore(s => s.selectedArtist);
  const engine = useGraphStore(s => s.engine);
  const initEngine = useGraphStore(s => s.initEngine);
  const nodeLimit = useGraphStore(s => s.nodeLimit);
  const isExploring = useGraphStore(s => s.isExploring);
  const seedMbid = useGraphStore(s => s.seedMbid);

  const setQuery = useGraphStore(s => s.setQuery);
  const setResults = useGraphStore(s => s.setResults);
  const setIsSearching = useGraphStore(s => s.setIsSearching);
  const setSelectedArtist = useGraphStore(s => s.setSelectedArtist);
  const clearSearch = useGraphStore(s => s.clearSearch);
  const setGraph = useGraphStore(s => s.setGraph);
  const clearGraph = useGraphStore(s => s.clearGraph);
  const selectNode = useGraphStore(s => s.selectNode);
  const setIsExploring = useGraphStore(s => s.setIsExploring);

  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  const doSearch = useCallback(async (value: string) => {
    if (value.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    setIsOpen(true);
    const mbProvider = mbProviderRef.current!;
    const result = await mbProvider.searchArtist(value);
    if (result.ok) {
      setResults(result.value);
      setIsSearching(false);
    } else {
      setResults([]);
      setIsSearching(false);
    }
    setHighlightedIndex(-1);
  }, [setResults, setIsSearching]);

  const debouncedSearch = useDebounce(doSearch, 350);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    setIsOpen(true);
    debouncedSearch(value);
  }, [setQuery, setResults, setIsSearching, debouncedSearch]);

  const handleSelectArtist = useCallback(async (artist: ArtistSummary) => {
    setSelectedArtist(artist);
    setIsOpen(false);
    setHighlightedIndex(-1);

    if (!engine) return;

    setIsExploring(true);
    try {
      initEngine({ maxNodes: nodeLimit });
      const currentEngine = useGraphStore.getState().engine;
      if (!currentEngine) return;
      const result = await currentEngine.explore(artist.name);
      if (result.ok) {
        setGraph(result.value);
        if (result.value.warnings.length > 0) {
          result.value.warnings.forEach(w => {
            toast.error(`${w.provider}: ${w.error}`, { duration: 4000 });
          });
        }
      } else {
        toast.error('Could not load graph data. Check your connection and try again.', { duration: 8000 });
      }
    } catch {
      toast.error('Could not load graph data. Check your connection and try again.', { duration: 8000 });
    } finally {
      setIsExploring(false);
    }
  }, [engine, initEngine, nodeLimit, setSelectedArtist, setIsExploring, setGraph]);

  const handleReset = useCallback(() => {
    clearSearch();
    clearGraph();
    selectNode(null);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [clearSearch, clearGraph, selectNode]);

  const handleClear = useCallback(() => {
    clearSearch();
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [clearSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        const artist = results[highlightedIndex];
        if (artist) void handleSelectArtist(artist);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }, [isOpen, results, highlightedIndex, handleSelectArtist]);

  // Close dropdown when clicking outside
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasGraph = seedMbid !== null;
  const showDropdown = isOpen && (isSearching || results.length > 0);

  return (
    <div className="search-container" ref={containerRef}>
      <div className="search-input-wrapper">
        <input
          className={`search-input${hasGraph ? ' search-input--active' : ''}`}
          type="text"
          placeholder="Search for an artist..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          disabled={isExploring}
          aria-label="Search for an artist"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
        />
        {hasGraph && (
          <button
            className="search-clear"
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {hasGraph && (
        <button
          className="search-reset"
          type="button"
          onClick={handleReset}
          aria-label="Reset graph"
        >
          Reset
        </button>
      )}

      {showDropdown && (
        <div className="search-dropdown" role="listbox">
          {isSearching && results.length === 0 ? (
            <>
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </>
          ) : (
            results.map((artist, index) => (
              <div
                key={artist.id}
                className={`search-item${index === highlightedIndex ? ' search-item--highlighted' : ''}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onMouseDown={(e) => {
                  // Use mousedown to fire before the blur event that would close the dropdown
                  e.preventDefault();
                  void handleSelectArtist(artist);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="search-item-name">{artist.name}</div>
                {(artist.disambiguation ?? artist.country) ? (
                  <div className="search-item-subtitle">
                    {[artist.disambiguation, artist.country].filter(Boolean).join(' · ')}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
