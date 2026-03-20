import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import { useGraphStore } from '../store/index.js';
import type { ForceNode, ForceLink } from '../types/graph.js';
import { buildExternalLinks } from '../utils/externalLinks.js';
import { genreColor } from '../utils/genreCluster.js';
import './DetailPanel.css';

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export function DetailPanel() {
  const {
    selectedNode,
    isPanelOpen,
    nodes,
    links,
    seedMbid,
    engine,
    isExpanding,
    expandingMbid,
    nodeLimit,
  } = useGraphStore(
    useShallow(s => ({
      selectedNode: s.selectedNode,
      isPanelOpen: s.isPanelOpen,
      nodes: s.nodes,
      links: s.links,
      seedMbid: s.seedMbid,
      engine: s.engine,
      isExpanding: s.isExpanding,
      expandingMbid: s.expandingMbid,
      nodeLimit: s.nodeLimit,
    }))
  );

  const selectNode = useGraphStore(s => s.selectNode);
  const initEngine = useGraphStore(s => s.initEngine);
  const setExpandingMbid = useGraphStore(s => s.setExpandingMbid);
  const setIsExpanding = useGraphStore(s => s.setIsExpanding);
  const addExpansion = useGraphStore(s => s.addExpansion);
  const triggerReheat = useGraphStore(s => s.triggerReheat);

  const handleExpand = useCallback(async () => {
    if (!engine || !selectedNode) return;

    const node = selectedNode;
    setExpandingMbid(node.mbid);
    setIsExpanding(true);

    try {
      initEngine({ maxNodes: nodeLimit });
      const currentEngine = useGraphStore.getState().engine;
      if (!currentEngine) return;
      const result = await currentEngine.expand(node.mbid);
      if (result.ok) {
        addExpansion(result.value, node);
        triggerReheat();

        if (result.value.truncated) {
          toast(`Node limit reached (${result.value.nodes.length}/${nodeLimit}). Graph is at maximum size.`, { duration: 5000 });
        }
        if (result.value.warnings.length > 0) {
          result.value.warnings.forEach((w: { provider: string; error: string }) => {
            toast.error(`${w.provider}: ${w.error}`, { duration: 4000 });
          });
        }
      } else {
        toast.error('Expansion failed. Try again.', { duration: 4000 });
      }
    } catch {
      toast.error('Expansion failed. Try again.', { duration: 4000 });
    } finally {
      setExpandingMbid(null);
      setIsExpanding(false);
    }
  }, [engine, initEngine, nodeLimit, selectedNode, setExpandingMbid, setIsExpanding, addExpansion, triggerReheat]);

  if (!selectedNode) {
    return <div className={`detail-panel${isPanelOpen ? ' detail-panel--open' : ''}`} />;
  }

  const node = selectedNode;

  // Find seed artist name
  const seedNode = nodes.find(n => n.mbid === seedMbid);
  const seedName = seedNode?.name ?? '';

  // Find edge to seed for similarity score
  const isTheSeed = node.mbid === seedMbid;
  const edgeToSeed = isTheSeed ? null : links.find(
    (l: ForceLink) =>
      (l.sourceMbid === node.mbid && l.targetMbid === seedMbid) ||
      (l.sourceMbid === seedMbid && l.targetMbid === node.mbid)
  ) ?? null;

  // Find connected nodes
  const connectedNodes = links
    .filter(
      (l: ForceLink) =>
        l.sourceMbid === node.mbid || l.targetMbid === node.mbid
    )
    .map((l: ForceLink) => {
      const connectedMbid = l.sourceMbid === node.mbid ? l.targetMbid : l.sourceMbid;
      const connectedNode = nodes.find(n => n.mbid === connectedMbid);
      return connectedNode ? { node: connectedNode, score: l.fusedScore } : null;
    })
    .filter((item): item is { node: ForceNode; score: number } => item !== null)
    .sort((a, b) => b.score - a.score);

  // External links
  const externalLinks = buildExternalLinks(node);

  // Fan count formatting
  const fanCount = node.metadata?.nb_fan;
  const fanCountFormatted = fanCount !== undefined
    ? fanCount.toLocaleString()
    : null;

  const isCurrentlyExpanding = isExpanding && expandingMbid === node.mbid;

  return (
    <div className={`detail-panel${isPanelOpen ? ' detail-panel--open' : ''}`}>
      {/* Artist image */}
      {node.metadata?.imageUrl && (
        <img
          className="detail-panel-image"
          src={node.metadata.imageUrl}
          alt={node.name}
        />
      )}

      {/* Artist name */}
      <h2 className="detail-panel-name">{node.name}</h2>
      {node.disambiguation && (
        <div className="detail-panel-disambiguation">{node.disambiguation}</div>
      )}

      {/* Genre tags */}
      {node.tags !== undefined && node.tags.length > 0 && (
        <div className="detail-panel-section">
          <div className="detail-panel-label">Genres</div>
          <div>
            {node.tags.slice(0, 8).map((tag) => {
              const tagName = typeof tag === 'string' ? tag : tag.name;
              const color = genreColor([tag]);
              return (
                <span
                  key={tagName}
                  className="genre-badge"
                  style={{
                    backgroundColor: color.replace('hsl(', 'hsla(').replace(')', ', 0.2)'),
                    color: color,
                  }}
                >
                  {titleCase(tagName)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Fan count */}
      {fanCountFormatted !== null && (
        <div className="detail-panel-section">
          <div className="detail-panel-label">Fans</div>
          <div className="detail-panel-value">{fanCountFormatted}</div>
        </div>
      )}

      {/* Similarity score to seed */}
      {edgeToSeed !== null && (
        <div className="detail-panel-section">
          <div className="detail-panel-label">Similarity to {seedName}</div>
          <div className="detail-panel-value">
            {Math.round(edgeToSeed.fusedScore * 100)}%
          </div>
        </div>
      )}

      {/* Provider source badges */}
      {node.sources.length > 0 && (
        <div className="detail-panel-section">
          <div className="detail-panel-label">Sources</div>
          <div>
            {node.sources.map((source) => (
              <span key={source} className="provider-badge">
                {source}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* External links */}
      {externalLinks.length > 0 && (
        <div className="detail-panel-section">
          <div className="detail-panel-label">Links</div>
          {externalLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              {link.name}
            </a>
          ))}
        </div>
      )}

      {/* Connected artists */}
      {connectedNodes.length > 0 && (
        <div className="detail-panel-section">
          <p className="connected-heading">Connected artists</p>
          {connectedNodes.map(({ node: connNode, score }) => (
            <div
              key={connNode.mbid}
              className="connected-artist"
              onClick={() => selectNode(connNode)}
            >
              <span
                className="connected-dot"
                style={{ background: genreColor(connNode.tags ?? []) }}
              />
              <span className="connected-artist-name">{connNode.name}</span>
              <span className="connected-artist-score">
                {Math.round(score * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expand button */}
      <button
        className="expand-button"
        onClick={() => void handleExpand()}
        disabled={isExpanding}
      >
        {isCurrentlyExpanding ? 'Expanding...' : 'Expand'}
      </button>
    </div>
  );
}
