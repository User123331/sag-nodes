import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods } from 'react-force-graph-2d';
import { forceCollide, forceManyBody, forceRadial } from 'd3-force';
import { easeCubicOut } from 'd3-ease';
import forceClustering from 'd3-force-clustering';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import { useGraphStore } from '../store/index.js';
import type { ForceNode, ForceLink } from '../types/graph.js';
import { genreColor, NO_GENRE_COLOR } from '../utils/genreCluster.js';
import { nodeRadius } from '../utils/nodeSize.js';
import { filterByDepth, filterByProviders, filterByNodeLimit } from '../utils/providerFilter.js';
import { findNearestInDirection } from '../utils/keyboardNav.js';
import { clamp, lerp, fract, BLOOM_DURATION_MS, EDGE_GROW_DURATION_MS, RIPPLE_DURATION_MS, RIPPLE_MAX_RADIUS, PARTICLE_RADIUS, PARTICLE_SKIP_SCALE } from '../utils/animationMath.js';
import type { ProviderId } from '@similar-artists-graph/engine';
import './GraphCanvas.css';

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

  // Control state
  const { maxDepth, nodeLimit, enabledProviders, layoutMode, isSidebarExpanded } = useGraphStore(
    useShallow(s => ({
      maxDepth: s.maxDepth,
      nodeLimit: s.nodeLimit,
      enabledProviders: s.enabledProviders,
      layoutMode: s.layoutMode,
      isSidebarExpanded: s.isSidebarExpanded,
    }))
  );

  // Keyboard/UI state from uiSlice
  const { focusedNodeMbid, isShortcutOverlayOpen } = useGraphStore(
    useShallow(s => ({
      focusedNodeMbid: s.focusedNodeMbid,
      isShortcutOverlayOpen: s.isShortcutOverlayOpen,
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
  const setFocusedNode = useGraphStore(s => s.setFocusedNode);
  const toggleShortcutOverlay = useGraphStore(s => s.toggleShortcutOverlay);
  const setProviderStatus = useGraphStore(s => s.setProviderStatus);
  const setProviderFetching = useGraphStore(s => s.setProviderFetching);
  const setProviderCooldown = useGraphStore(s => s.setProviderCooldown);

  // Refs to avoid stale closures in canvas callbacks
  const seedMbidRef = useRef(seedMbid);
  const selectedNodeRef = useRef(selectedNode);
  const expandingMbidRef = useRef(expandingMbid);
  const expansionStartTimeRef = useRef(expansionStartTime);
  const nodesRef = useRef(nodes);
  const linksRef = useRef(links);
  const focusedNodeMbidRef = useRef(focusedNodeMbid);
  const isShortcutOverlayOpenRef = useRef(isShortcutOverlayOpen);
  const enabledProvidersRef = useRef(enabledProviders);
  const cooldownTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Ripple animation refs
  const rippleNodeMbidRef = useRef<string | null>(null);
  const rippleStartTimeRef = useRef<number | null>(null);

  useEffect(() => { seedMbidRef.current = seedMbid; }, [seedMbid]);
  useEffect(() => { selectedNodeRef.current = selectedNode; }, [selectedNode]);
  useEffect(() => { expandingMbidRef.current = expandingMbid; }, [expandingMbid]);
  useEffect(() => { expansionStartTimeRef.current = expansionStartTime; }, [expansionStartTime]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { linksRef.current = links; }, [links]);
  useEffect(() => { focusedNodeMbidRef.current = focusedNodeMbid; }, [focusedNodeMbid]);
  useEffect(() => { isShortcutOverlayOpenRef.current = isShortcutOverlayOpen; }, [isShortcutOverlayOpen]);
  useEffect(() => { enabledProvidersRef.current = enabledProviders; }, [enabledProviders]);

  // Cleanup cooldown timers on unmount
  useEffect(() => {
    return () => {
      cooldownTimersRef.current.forEach(clearTimeout);
    };
  }, []);

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

  // Canvas dimensions — SSR-safe
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [windowHeight, setWindowHeight] = useState(() => typeof window !== 'undefined' ? window.innerHeight : 800);
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Canvas width accounts for left sidebar (only when graph exists) and right detail panel
  const leftSidebarWidth = seedMbid !== null ? (isSidebarExpanded ? 220 : 40) : 0;
  const canvasWidth = windowWidth - leftSidebarWidth - (isPanelOpen ? 320 : 0);

  // Apply client-side filtering in order: providers -> depth -> nodeLimit
  const filteredGraphData = useMemo(() => {
    if (nodes.length === 0) return { nodes, links };

    let filtered = filterByProviders(nodes, links, enabledProviders);
    filtered = filterByDepth(filtered.nodes, filtered.links, maxDepth);
    if (seedMbid !== null) {
      filtered = filterByNodeLimit(filtered.nodes, filtered.links, seedMbid, nodeLimit);
    }
    return filtered;
  }, [nodes, links, enabledProviders, maxDepth, nodeLimit, seedMbid]);

  // Store visible node mbids in a ref for renderNode/renderLink
  const visibleMbidsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    visibleMbidsRef.current = new Set(filteredGraphData.nodes.map(n => n.mbid));
  }, [filteredGraphData]);

  // Graph data for ForceGraph2D
  const graphData = useMemo(() => ({
    nodes: filteredGraphData.nodes,
    links: filteredGraphData.links,
  }), [filteredGraphData]);

  // Configure collide force after mount
  useEffect(() => {
    if (graphRef.current) {
      const collideFn = forceCollide((node: ForceNode) => nodeRadius(node.metadata?.nb_fan) + 2) as unknown as (alpha: number) => void;
      graphRef.current.d3Force('collide', collideFn as Parameters<typeof graphRef.current.d3Force>[1]);
    }
  });

  // Layout toggle — handles force, radial, and cluster modes
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (layoutMode === 'cluster') {
      const clusterForce = forceClustering<ForceNode>()
        .clusterId((node) => {
          if (!node.tags || node.tags.length === 0) return node.mbid; // unique ID = scatter freely
          const first = node.tags[0]!;
          return typeof first === 'string' ? first : first.name;
        })
        .strength(0.3)
        .distanceMin(1);
      graph.d3Force('cluster', clusterForce as unknown as Parameters<typeof graph.d3Force>[1]);
      graph.d3Force('radial', null);
      graph.d3Force('charge', forceManyBody().strength(-80) as unknown as Parameters<typeof graph.d3Force>[1]);
      graph.d3ReheatSimulation();
    } else if (layoutMode === 'radial') {
      const radialFn = forceRadial<ForceNode>(
        (node) => (node.depthFromSeed ?? 0) * 120,
        0, 0
      ).strength(0.8);
      graph.d3Force('cluster', null);
      graph.d3Force('radial', radialFn as unknown as Parameters<typeof graph.d3Force>[1]);
      graph.d3Force('charge', null);
      graph.d3ReheatSimulation();
    } else {
      // 'force' mode: remove cluster and radial, restore charge
      graph.d3Force('cluster', null);
      graph.d3Force('radial', null);
      graph.d3Force('charge', forceManyBody().strength(-80) as unknown as Parameters<typeof graph.d3Force>[1]);
      graph.d3ReheatSimulation();
    }
  }, [layoutMode]);

  // Click timer for double-click detection
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickedRef = useRef<string | null>(null);

  const handleExpand = useCallback(async (node: ForceNode) => {
    if (!engine) return;

    setExpandingMbid(node.mbid);
    setIsExpanding(true);

    // Trigger ripple immediately on expansion (before API response)
    rippleNodeMbidRef.current = node.mbid;
    rippleStartTimeRef.current = Date.now();

    // Set all enabled providers to fetching
    enabledProvidersRef.current.forEach((id: ProviderId) => {
      setProviderFetching(id, true);
    });

    try {
      const result = await engine.expand(node.mbid);
      if (result.ok) {
        addExpansion(result.value, node);
        triggerReheat();

        if (result.value.truncated) {
          toast(`Node limit reached (${nodesRef.current.length}/150). Graph is at maximum size.`, { duration: 5000 });
        }
        if (result.value.warnings.length > 0) {
          const DEFAULT_COOLDOWN_MS = 30_000;
          result.value.warnings.forEach(w => {
            toast.error(`${w.provider}: ${w.error}`, { duration: 4000 });
            if (w.error === 'RateLimitError') {
              const endsAt = Date.now() + DEFAULT_COOLDOWN_MS;
              setProviderCooldown(w.provider as ProviderId, endsAt);
              setProviderStatus(w.provider as ProviderId, 'rate-limited');
              // Clear any existing timer for this provider
              const existing = cooldownTimersRef.current.get(w.provider);
              if (existing !== undefined) clearTimeout(existing);
              // Auto-clear cooldown badge after delay
              const timer = setTimeout(() => {
                setProviderCooldown(w.provider as ProviderId, null);
                setProviderStatus(w.provider as ProviderId, 'active');
                cooldownTimersRef.current.delete(w.provider);
              }, DEFAULT_COOLDOWN_MS);
              cooldownTimersRef.current.set(w.provider, timer);
            } else {
              setProviderStatus(w.provider as ProviderId, 'erroring');
            }
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
      // Clear fetching state for all enabled providers
      enabledProvidersRef.current.forEach((id: ProviderId) => {
        setProviderFetching(id, false);
      });
    }
  }, [engine, setExpandingMbid, setIsExpanding, addExpansion, triggerReheat, setProviderStatus, setProviderFetching, setProviderCooldown]);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const currentNodes = nodesRef.current;

      if (e.key === 'Tab') {
        e.preventDefault();
        if (currentNodes.length === 0) return;

        // Sort by fusedScore of direct edge to seed (highest first)
        const seed = seedMbidRef.current;
        const scoreMap = new Map<string, number>();
        linksRef.current.forEach(l => {
          if (l.sourceMbid === seed) scoreMap.set(l.targetMbid, l.fusedScore);
          else if (l.targetMbid === seed) scoreMap.set(l.sourceMbid, l.fusedScore);
        });
        const sorted = [...currentNodes].sort((a, b) => (scoreMap.get(b.mbid) ?? 0) - (scoreMap.get(a.mbid) ?? 0));

        const currentMbid = focusedNodeMbidRef.current;
        const currentIdx = currentMbid !== null ? sorted.findIndex(n => n.mbid === currentMbid) : -1;
        const nextIdx = e.shiftKey
          ? (currentIdx <= 0 ? sorted.length - 1 : currentIdx - 1)
          : (currentIdx >= sorted.length - 1 ? 0 : currentIdx + 1);
        const nextNode = sorted[nextIdx];
        if (nextNode) setFocusedNode(nextNode.mbid);

      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const currentMbid = focusedNodeMbidRef.current;
        const focusedNode = currentMbid !== null ? currentNodes.find(n => n.mbid === currentMbid) ?? null : null;
        if (!focusedNode) {
          // Focus the first node
          if (currentNodes.length > 0) {
            const first = currentNodes[0];
            if (first) setFocusedNode(first.mbid);
          }
          return;
        }
        const nearest = findNearestInDirection(
          focusedNode,
          currentNodes,
          e.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
        );
        if (nearest) setFocusedNode(nearest.mbid);

      } else if (e.key === 'Enter') {
        const currentMbid = focusedNodeMbidRef.current;
        const focusedNode = currentMbid !== null ? currentNodes.find(n => n.mbid === currentMbid) ?? null : null;
        if (focusedNode) void handleExpand(focusedNode);

      } else if (e.key === 'Escape') {
        selectNode(null);
        setFocusedNode(null);
        if (isShortcutOverlayOpenRef.current) toggleShortcutOverlay();

      } else if (e.key === '/') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.search-input')?.focus();

      } else if (e.key === '?') {
        toggleShortcutOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setFocusedNode, handleExpand, selectNode, toggleShortcutOverlay]);

  // Auto-pan on focus change
  useEffect(() => {
    if (focusedNodeMbid === null) return;
    const node = nodesRef.current.find(n => n.mbid === focusedNodeMbid);
    if (node && node.x !== undefined && node.y !== undefined) {
      graphRef.current?.centerAt(node.x, node.y, 300);
    }
  }, [focusedNodeMbid]);

  // Cached popularity ranking for progressive label visibility (avoids per-node per-frame sorting)
  const labelRankRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const sorted = [...nodes].sort((a, b) => (b.metadata?.nb_fan ?? 0) - (a.metadata?.nb_fan ?? 0));
    const rankMap = new Map<string, number>();
    sorted.forEach((n, i) => rankMap.set(n.mbid, i));
    labelRankRef.current = rankMap;
  }, [nodes]);

  // Node canvas renderer
  const renderNode = useCallback((
    node: ForceNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const baseRadius = nodeRadius(node.metadata?.nb_fan);
    const x = node.x ?? 0;
    const y = node.y ?? 0;

    // --- Bloom animation: scale from 0 to full radius over 400ms ---
    let radius = baseRadius;
    if (node.addedAt !== undefined) {
      const elapsed = Date.now() - node.addedAt;
      if (elapsed < BLOOM_DURATION_MS) {
        const t = clamp(elapsed / BLOOM_DURATION_MS, 0, 1);
        radius = baseRadius * easeCubicOut(t);
      }
    }
    radius = Math.max(0.5, radius); // minimum drawn radius to prevent invisible arc

    const isSelected = selectedNodeRef.current?.mbid === node.mbid;
    const isSeed = seedMbidRef.current === node.mbid;
    const isExpandingNode = expandingMbidRef.current === node.mbid;
    const hasSelection = selectedNodeRef.current !== null;

    // Dimming: non-selected nodes at 30% opacity when something is selected
    if (hasSelection && !isSelected) {
      ctx.globalAlpha = 0.3;
    } else {
      ctx.globalAlpha = 1.0;
    }

    // Expanding glow (pulsing blue ring while waiting for API)
    if (isExpandingNode && expansionStartTimeRef.current !== null) {
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
    ctx.fillStyle = NO_GENRE_COLOR;
    ctx.fill();

    // Genre ring: colored neon glow for nodes with tags
    const genreRingColor = (node.tags !== undefined && node.tags.length > 0)
      ? genreColor(node.tags)
      : NO_GENRE_COLOR;

    if (genreRingColor !== NO_GENRE_COLOR) {
      ctx.save();
      ctx.shadowColor = genreRingColor;
      ctx.shadowBlur = 3;
      if (hasSelection && !isSelected) {
        ctx.globalAlpha = 0.3;
      }
      ctx.beginPath();
      ctx.arc(x, y, radius + 1, 0, 2 * Math.PI);
      ctx.strokeStyle = genreRingColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

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

    // Focus ring: keyboard navigation focus indicator
    if (node.mbid === focusedNodeMbidRef.current) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Reset alpha
    ctx.globalAlpha = 1.0;

    // --- Progressive label visibility based on zoom ---
    const rank = labelRankRef.current.get(node.mbid) ?? Infinity;
    const totalNodes = nodesRef.current.length;
    let showLabel = false;
    if (isSeed) {
      showLabel = true; // always show seed label
    } else if (globalScale >= 4) {
      showLabel = true; // all labels at high zoom
    } else if (globalScale >= 2) {
      showLabel = rank < Math.ceil(totalNodes / 2); // top 50% by popularity
    } else if (globalScale >= 1) {
      showLabel = rank < 10; // top 10 by popularity
    }
    // else globalScale < 1: only seed (handled above)

    if (showLabel) {
      const fontSize = 10 / globalScale; // fixed ~10px screen-space
      ctx.font = `${fontSize}px ui-monospace, 'Cascadia Code', Menlo, 'Courier New', monospace`;
      ctx.fillStyle = '#f5f5f5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.globalAlpha = hasSelection && !isSelected ? 0.3 : 1.0;
      // Text shadow for readability: draw text in black offset, then white on top
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2 / globalScale;
      ctx.strokeText(node.name, x, y + radius + 2);
      ctx.fillText(node.name, x, y + radius + 2);
      ctx.globalAlpha = 1.0;
    }
  }, []);

  // Link canvas renderer with edge grow animation and particle drift
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
    const connectedToSelected = selected !== null &&
      (link.sourceMbid === selected.mbid || link.targetMbid === selected.mbid);

    let opacity = Math.max(0.05, link.fusedScore);
    if (selected !== null && !connectedToSelected) {
      opacity = Math.max(0.05, link.fusedScore) * 0.1;
    }

    // --- Edge grow animation: new edges grow from source to target over 400ms ---
    let progress = 1.0;
    const targetNode = target;
    if (targetNode.addedAt !== undefined) {
      const elapsed = Date.now() - targetNode.addedAt;
      if (elapsed < EDGE_GROW_DURATION_MS) {
        progress = easeCubicOut(clamp(elapsed / EDGE_GROW_DURATION_MS, 0, 1));
      }
    }

    const endX = sx + (tx - sx) * progress;
    const endY = sy + (ty - sy) * progress;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;

    // Edge thickness: 0.5px (weak) to 1.5px (strong), screen-space
    const baseWidth = 0.5 + link.fusedScore;
    const selectionBoost = connectedToSelected ? 1.5 : 1.0;
    ctx.lineWidth = (baseWidth * selectionBoost) / globalScale;
    ctx.stroke();

    // --- Particle drift on edges ---
    // Skip particles at extreme zoom-out or during edge grow
    if (globalScale < PARTICLE_SKIP_SCALE || progress < 1.0) return;

    // Dim particles when selection active and edge not connected
    if (selected !== null && !connectedToSelected) return;

    const count = link.fusedScore > 0.6 ? 3 : link.fusedScore > 0.3 ? 2 : 1;
    const cycleDuration = 4000 - (link.fusedScore * 2500); // 1500ms fast to 4000ms slow
    const now = Date.now();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

    for (let i = 0; i < count; i++) {
      const phaseOffset = i / count;
      // Forward particle
      const tFwd = fract((now / cycleDuration) + phaseOffset);
      const px = lerp(sx, tx, tFwd);
      const py = lerp(sy, ty, tFwd);
      ctx.beginPath();
      ctx.arc(px, py, PARTICLE_RADIUS, 0, 2 * Math.PI);
      ctx.fill();

      // Backward particle
      const tBwd = 1 - tFwd;
      const bx = lerp(sx, tx, tBwd);
      const by = lerp(sy, ty, tBwd);
      ctx.beginPath();
      ctx.arc(bx, by, PARTICLE_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, []);

  // Post-render callback for ripple effect
  const renderFramePost = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
    const mbid = rippleNodeMbidRef.current;
    const startTime = rippleStartTimeRef.current;
    if (!mbid || !startTime) return;

    const elapsed = Date.now() - startTime;
    if (elapsed > RIPPLE_DURATION_MS) {
      rippleNodeMbidRef.current = null;
      rippleStartTimeRef.current = null;
      return;
    }

    const node = nodesRef.current.find(n => n.mbid === mbid);
    if (!node || node.x === undefined || node.y === undefined) return;

    const t = clamp(elapsed / RIPPLE_DURATION_MS, 0, 1);
    const rippleRadius = RIPPLE_MAX_RADIUS * t;
    const alpha = (1 - t) * 0.8;
    const color = (node.tags !== undefined && node.tags.length > 0)
      ? genreColor(node.tags)
      : '#3b82f6';

    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, rippleRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2 / globalScale;
    ctx.stroke();
    ctx.restore();
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
          onRenderFramePost={renderFramePost}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          warmupTicks={50}
          cooldownTicks={Infinity}
          autoPauseRedraw={false}
          d3AlphaDecay={0.0228}
          d3VelocityDecay={0.3}
          width={canvasWidth}
          height={windowHeight}
          backgroundColor="#0a0a0a"
        />
      )}
    </div>
  );
}
