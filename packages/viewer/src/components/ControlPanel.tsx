import { useRef, useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '../store/index.js';
import type { ProviderId } from '@similar-artists-graph/engine';
import { buildJsonExport, downloadJson } from '../utils/exportJson.js';
import { buildGexf, downloadGexf } from '../utils/exportGexf.js';
import './ControlPanel.css';

const PROVIDER_ORDER: ProviderId[] = [
  'musicbrainz',
  'listenbrainz',
  'lastfm',
  'deezer',
  'tastedive',
  'spotify',
];

const PROVIDER_LABELS: Record<ProviderId, string> = {
  musicbrainz: 'MusicBrainz',
  listenbrainz: 'ListenBrainz',
  lastfm: 'Last.fm',
  deezer: 'Deezer',
  tastedive: 'TasteDive',
  spotify: 'Spotify',
};

export function ControlPanel() {
  const {
    nodes,
    links,
    seedMbid,
    enabledProviders,
    providerStatus,
    providerCooldownEndsAt,
    providerIsFetching,
    maxDepth,
    nodeLimit,
    layoutMode,
    isSidebarExpanded,
  } = useGraphStore(
    useShallow(s => ({
      nodes: s.nodes,
      links: s.links,
      seedMbid: s.seedMbid,
      enabledProviders: s.enabledProviders,
      providerStatus: s.providerStatus,
      providerCooldownEndsAt: s.providerCooldownEndsAt,
      providerIsFetching: s.providerIsFetching,
      maxDepth: s.maxDepth,
      nodeLimit: s.nodeLimit,
      layoutMode: s.layoutMode,
      isSidebarExpanded: s.isSidebarExpanded,
    }))
  );

  const toggleProvider = useGraphStore(s => s.toggleProvider);
  const setMaxDepth = useGraphStore(s => s.setMaxDepth);
  const setNodeLimit = useGraphStore(s => s.setNodeLimit);
  const setLayoutMode = useGraphStore(s => s.setLayoutMode);
  const setSidebarExpanded = useGraphStore(s => s.setSidebarExpanded);
  const resetControls = useGraphStore(s => s.resetControls);
  const clearGraph = useGraphStore(s => s.clearGraph);
  const selectNode = useGraphStore(s => s.selectNode);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cooldown countdown tickers per provider
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasActiveCooldowns = Object.values(providerCooldownEndsAt).some(v => v !== null && v > Date.now());
    if (!hasActiveCooldowns) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [providerCooldownEndsAt]);

  const startCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      clearTimeout(collapseTimerRef.current);
    }
    collapseTimerRef.current = setTimeout(() => {
      // Don't collapse if an input/range is focused inside sidebar
      const active = document.activeElement;
      if (sidebarRef.current && active && sidebarRef.current.contains(active)) return;
      setSidebarExpanded(false);
    }, 3000);
  }, [setSidebarExpanded]);

  const cancelCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    cancelCollapseTimer();
    setSidebarExpanded(true);
  }, [cancelCollapseTimer, setSidebarExpanded]);

  const handleMouseLeave = useCallback(() => {
    startCollapseTimer();
  }, [startCollapseTimer]);

  const handleMouseMove = useCallback(() => {
    if (isSidebarExpanded) {
      cancelCollapseTimer();
      startCollapseTimer();
    }
  }, [isSidebarExpanded, cancelCollapseTimer, startCollapseTimer]);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current !== null) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  const handleExportJson = useCallback(() => {
    if (nodes.length === 0 || seedMbid === null) return;
    const seedNode = nodes.find(n => n.mbid === seedMbid);
    const seedName = seedNode?.name ?? 'graph';
    const data = buildJsonExport(nodes, links, seedMbid, seedName, maxDepth, [...enabledProviders]);
    downloadJson(data, `${seedName}-graph.json`);
  }, [nodes, links, seedMbid, maxDepth, enabledProviders]);

  const handleExportGexf = useCallback(() => {
    if (nodes.length === 0 || seedMbid === null) return;
    const seedNode = nodes.find(n => n.mbid === seedMbid);
    const seedName = seedNode?.name ?? 'graph';
    const xml = buildGexf(nodes, links, seedName);
    downloadGexf(xml, `${seedName}-graph.gexf`);
  }, [nodes, links, seedMbid]);

  const handleReset = useCallback(() => {
    clearGraph();
    resetControls();
    selectNode(null);
    history.replaceState(null, '', location.pathname);
  }, [clearGraph, resetControls, selectNode]);

  function getStatusDotClass(id: ProviderId): string {
    if (!enabledProviders.has(id)) return 'status-dot status-dot--disabled';
    const fetching = providerIsFetching[id];
    const baseClass = fetching ? 'status-dot status-dot--fetching' : 'status-dot';
    return baseClass;
  }

  function getStatusDotColor(id: ProviderId): string {
    if (!enabledProviders.has(id)) return 'var(--color-status-disabled)';
    const status = providerStatus[id];
    if (status === 'rate-limited') return 'var(--color-status-warning)';
    if (status === 'erroring') return 'var(--color-status-error)';
    return 'var(--color-status-active)';
  }

  function getCooldownText(id: ProviderId): string | null {
    const status = providerStatus[id];
    if (status !== 'rate-limited') return null;
    const endsAt = providerCooldownEndsAt[id];
    if (endsAt !== null && endsAt !== undefined) {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      if (remaining > 0) return `Rate limited (${remaining}s)`;
    }
    return 'Rate limited';
  }

  // Only visible when graph exists
  const isVisible = seedMbid !== null;

  return (
    <div
      ref={sidebarRef}
      className={`control-panel${isSidebarExpanded ? ' control-panel--expanded' : ' control-panel--collapsed'}${!isVisible ? ' control-panel--hidden' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {!isSidebarExpanded ? (
        /* Collapsed icon strip */
        <div className="control-panel-icon-strip">
          {/* Sliders icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="control-panel-icon">
            <line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="7" cy="5" r="2" fill="currentColor"/>
            <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="13" cy="10" r="2" fill="currentColor"/>
            <line x1="2" y1="15" x2="18" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="7" cy="15" r="2" fill="currentColor"/>
          </svg>
          {/* Grid/providers icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="control-panel-icon">
            <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          {/* Download icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="control-panel-icon">
            <path d="M10 2v10M10 12l-3-3M10 12l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      ) : (
        /* Expanded content */
        <div className="control-panel-content">
          {/* Controls section */}
          <div className="control-panel-section">
            <div className="control-panel-section-heading">Controls</div>

            {/* Depth slider */}
            <div className="control-slider">
              <div className="control-slider-header">
                <span className="control-slider-label">Depth</span>
                <span className="control-slider-value">{maxDepth}</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={maxDepth}
                onChange={e => setMaxDepth(Number(e.target.value))}
                className="control-range"
              />
            </div>

            {/* Node limit slider */}
            <div className="control-slider">
              <div className="control-slider-header">
                <span className="control-slider-label">Max Nodes</span>
                <span className="control-slider-value">{nodeLimit}</span>
              </div>
              <input
                type="range"
                min={10}
                max={200}
                step={10}
                value={nodeLimit}
                onChange={e => setNodeLimit(Number(e.target.value))}
                className="control-range"
              />
            </div>
          </div>

          {/* Providers section */}
          <div className="control-panel-section">
            <div className="control-panel-section-heading">Providers</div>
            {PROVIDER_ORDER.map(id => {
              const isEnabled = enabledProviders.has(id);
              const cooldownText = getCooldownText(id);
              return (
                <div key={id} className="provider-row">
                  <span
                    className={getStatusDotClass(id)}
                    style={{ background: getStatusDotColor(id) }}
                  />
                  <div className="provider-row-info">
                    <span className="provider-row-name">{PROVIDER_LABELS[id]}</span>
                    {cooldownText !== null && (
                      <span className="provider-row-cooldown">{cooldownText}</span>
                    )}
                  </div>
                  <button
                    className={`provider-toggle${isEnabled ? ' provider-toggle--on' : ''}`}
                    onClick={() => toggleProvider(id)}
                    aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${PROVIDER_LABELS[id]}`}
                    role="switch"
                    aria-checked={isEnabled}
                  >
                    <span className="provider-toggle-thumb" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Layout section */}
          <div className="control-panel-section">
            <div className="control-panel-section-heading">Layout</div>
            <div className="layout-toggle">
              <button
                className={`layout-toggle-btn${layoutMode === 'force' ? ' layout-toggle-btn--active' : ''}`}
                onClick={() => setLayoutMode('force')}
              >
                Force
              </button>
              <button
                className={`layout-toggle-btn${layoutMode === 'radial' ? ' layout-toggle-btn--active' : ''}`}
                onClick={() => setLayoutMode('radial')}
              >
                Radial
              </button>
              <button
                className={`layout-toggle-btn${layoutMode === 'cluster' ? ' layout-toggle-btn--active' : ''}`}
                onClick={() => setLayoutMode('cluster')}
              >
                Cluster
              </button>
            </div>
          </div>

          {/* Export section */}
          <div className="control-panel-section">
            <div className="control-panel-section-heading">Export</div>
            <div className="export-buttons">
              <button
                className="export-btn"
                onClick={handleExportJson}
                disabled={nodes.length === 0}
              >
                Export JSON
              </button>
              <button
                className="export-btn"
                onClick={handleExportGexf}
                disabled={nodes.length === 0}
              >
                Export GEXF
              </button>
            </div>
          </div>

          {/* Reset button */}
          <button
            className="reset-btn"
            onClick={handleReset}
          >
            Reset Graph
          </button>
        </div>
      )}
    </div>
  );
}
