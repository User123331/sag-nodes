import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods } from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import { useGraphStore } from '../store/index.js';
import type { ForceNode, ForceLink } from '../types/graph.js';
import { genreColor, NO_GENRE_COLOR } from '../utils/genreCluster.js';
import { nodeRadius } from '../utils/nodeSize.js';
import './GraphCanvas.css';

const LABEL_ZOOM_THRESHOLD = 2.5;
const DOUBLE_CLICK_MS = 300;

export function GraphCanvas() {
  // Use `any` cast to avoid complex generic nesting with ForceGraph2D's FCwithRef signature
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<ForceGraphMethods<any, any> | undefined>(undefined);

  // Graph state
  const { nodes, links, seedMbid, truncated } = useGraphStore(
    useShallow(s => ({
      nodes: s.nodes,
      links: s.links,
      seedMbid: s.seedMbid,
      truncated: s.truncated,
    }))
  );

  // UI state
  const { selectedNode, isPanelOpen, expandingMbid, expansionStartTime, reheatCounter } = useGraphStore(
    useShallow(s => ({
      selectedNode: s.selectedNode,
      isPanelOpen: s.isPanelOpen,
      expandingMbid: s.expandingMbid,
      expansionStartTime: s.expansionStartTime,
      reheatCounter: s.reheatCounter,
    }))
  );

  // Engine state
  const { engine, isExploring, isExpanding } = useGraphStore(
    useShallow(s => ({
      engine: s.engine,
      isExploring: s.isExploring,
      isExpanding: s.isExpanding,
    }))
  );

  // Actions
  const selectNode = useGraphStore(s => s.selectNode);
  const setExpandingMbid = useGraphStore(s => s.setExpandingMbid);
  const addExpansion = useGraphStore(s => s.addExpansion);
  const setIsExpanding = useGraphStore(s => s.setIsExpanding);
  const triggerReheat = useGraphStore(s => s.triggerReheat);

  // Refs to avoid stale closures in canvas callbacks
  const seedMbidRef = useRef(seedMbid);
  const selectedNodeRef = useRef(selectedNode);
  const expandingMbidRef = useRef(expandingMbid);
  const expansionStartTimeRef = useRef(expansionStartTime);
  const nodesRef = useRef(nodes);

  useEffect(() => { seedMbidRef.current = seedMbid; }, [seedMbid]);
  useEffect(() => { selectedNodeRef.current = selectedNode; }, [selectedNode]);
  useEffect(() => { expandingMbidRef.current = expandingMbid; }, [expandingMbid]);
  useEffect(() => { expansionStartTimeRef.current = expansionStartTime; }, [expansionStartTime]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // Watch reheatCounter — when DetailPanel triggers reheat, fire d3ReheatSimulation and unpin after 1500ms
  useEffect(() => {
    if (reheatCounter === 0) return;
    graphRef.current?.d3ReheatSimulation();
    const timer = setTimeout(() => {
      nodesRef.current.forEach((n: ForceNode) => {
        delete (n as { fx?: number | null }).fx;
        delete (n as { fy?: number | null }).fy;
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [reheatCounter]);

  // Canvas dimensions
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canvasWidth = windowWidth - (isPanelOpen ? 320 : 0);

  // Graph data memoized
  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  // Configure collide force after mount
  useEffect(() => {
    if (graphRef.current) {
      // Cast the forceFn to match expected signature
      const collideFn = forceCollide((node: ForceNode) => nodeRadius(node.metadata?.nb_fan) + 2) as unknown as (alpha: number) => void;
      graphRef.current.d3Force('collide', collideFn as Parameters<typeof graphRef.current.d3Force>[1]);
    }
  });

  // Click timer for double-click detection
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickedRef = useRef<string | null>(null);

  const handleExpand = useCallback(async (node: ForceNode) => {
    if (!engine) return;

    setExpandingMbid(node.mbid);
    setIsExpanding(true);

    try {
      const result = await engine.expand(node.mbid);
      if (result.ok) {
        addExpansion(result.value, node);
        // triggerReheat increments reheatCounter, which the useEffect above watches
        // to call d3ReheatSimulation and unpin nodes after 1500ms
        triggerReheat();

        if (result.value.truncated) {
          toast(`Node limit reached (${nodes.length}/150). Graph is at maximum size.`, { duration: 5000 });
        }
        if (result.value.warnings.length > 0) {
          result.value.warnings.forEach(w => {
            toast.error(`${w.provider}: ${w.error}`, { duration: 4000 });
          });
        }
      } else {
        toast.error('Could not expand node. Check your connection and try again.', { duration: 6000 });
      }
    } catch {
      toast.error('Could not expand node. Check your connection and try again.', { duration: 6000 });
    } finally {
      setExpandingMbid(null);
      setIsExpanding(false);
    }
  }, [engine, setExpandingMbid, setIsExpanding, addExpansion, triggerReheat, nodes.length]);

  const handleNodeClick = useCallback((node: ForceNode) => {
    if (lastClickedRef.current === node.mbid && clickTimerRef.current !== null) {
      // Double-click: expand
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      lastClickedRef.current = null;
      void handleExpand(node);
    } else {
      // Single click: select
      lastClickedRef.current = node.mbid;
      selectNode(node);
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        lastClickedRef.current = null;
      }, DOUBLE_CLICK_MS);
    }
  }, [handleExpand, selectNode]);

  const handleBackgroundClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Node canvas renderer
  const renderNode = useCallback((
    node: ForceNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const radius = nodeRadius(node.metadata?.nb_fan);
    const x = node.x ?? 0;
    const y = node.y ?? 0;

    const isSelected = selectedNodeRef.current?.mbid === node.mbid;
    const isSeed = seedMbidRef.current === node.mbid;
    const isExpanding = expandingMbidRef.current === node.mbid;
    const hasSelection = selectedNodeRef.current !== null;

    // Dimming: non-selected nodes at 30% opacity when something is selected
    if (hasSelection && !isSelected) {
      ctx.globalAlpha = 0.3;
    } else {
      ctx.globalAlpha = 1.0;
    }

    // Expanding glow
    if (isExpanding && expansionStartTimeRef.current !== null) {
      const elapsed = Date.now() - expansionStartTimeRef.current;
      const alpha = Math.sin(elapsed / 200) * 0.3 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, radius + 6, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.fill();
    }

    // Node fill
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = NO_GENRE_COLOR; // Default: no genre data on ForceNode
    ctx.fill();

    // Seed ring: white 2px
    if (isSeed) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Selected ring: accent 3px
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Reset alpha
    ctx.globalAlpha = 1.0;

    // Zoom-adaptive labels
    const showLabel = globalScale >= LABEL_ZOOM_THRESHOLD || isSeed;
    if (showLabel) {
      const fontSize = Math.max(8, 12 / globalScale);
      ctx.font = `${fontSize}px ui-monospace, monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.globalAlpha = hasSelection && !isSelected ? 0.3 : 1.0;
      ctx.fillText(node.name, x, y + radius + 2);
      ctx.globalAlpha = 1.0;
    }
  }, []);

  // Link canvas renderer
  const renderLink = useCallback((
    link: ForceLink,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const source = link.source as ForceNode;
    const target = link.target as ForceNode;
    if (!source || !target) return;

    const sx = source.x ?? 0;
    const sy = source.y ?? 0;
    const tx = target.x ?? 0;
    const ty = target.y ?? 0;

    const selected = selectedNodeRef.current;
    let opacity = Math.max(0.05, link.fusedScore);

    if (selected !== null) {
      const connectedToSelected =
        (link.sourceMbid === selected.mbid || link.targetMbid === selected.mbid);
      if (!connectedToSelected) {
        opacity = Math.max(0.05, link.fusedScore) * 0.1;
      }
    }

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.lineWidth = 1 / globalScale;
    ctx.stroke();
  }, []);

  const isEmpty = nodes.length === 0 && !isExploring;

  return (
    <div className="graph-container">
      {isEmpty ? (
        <div className="graph-empty">
          <h2>Find your next rabbit hole</h2>
          <p>Search for any artist to explore their musical neighborhood.</p>
        </div>
      ) : (
        <ForceGraph2D
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={graphRef as any}
          graphData={graphData as any}
          nodeId="mbid"
          linkSource="sourceMbid"
          linkTarget="targetMbid"
          nodeCanvasObject={renderNode}
          nodeCanvasObjectMode={() => 'replace'}
          linkCanvasObject={renderLink}
          linkCanvasObjectMode={() => 'replace'}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          warmupTicks={50}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          width={canvasWidth}
          height={window.innerHeight}
          backgroundColor="#0a0a0a"
        />
      )}
    </div>
  );
}
