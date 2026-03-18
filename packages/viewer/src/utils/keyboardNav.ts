import type { ForceNode } from '../types/graph.js';

type Direction = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export function getConnectedNeighbors(
  mbid: string,
  links: ReadonlyArray<{ sourceMbid: string; targetMbid: string; fusedScore: number }>,
  nodes: ForceNode[],
): ForceNode[] {
  const neighborMbids = new Set<string>();
  links.forEach(l => {
    if (l.sourceMbid === mbid) neighborMbids.add(l.targetMbid);
    else if (l.targetMbid === mbid) neighborMbids.add(l.sourceMbid);
  });

  const neighborNodes = nodes.filter(n => neighborMbids.has(n.mbid));

  // Sort descending by fusedScore of the connecting edge
  const scoreMap = new Map<string, number>();
  links.forEach(l => {
    if (l.sourceMbid === mbid) scoreMap.set(l.targetMbid, l.fusedScore);
    else if (l.targetMbid === mbid) scoreMap.set(l.sourceMbid, l.fusedScore);
  });

  return neighborNodes.sort((a, b) => (scoreMap.get(b.mbid) ?? 0) - (scoreMap.get(a.mbid) ?? 0));
}

export function findNearestInDirection(
  focused: ForceNode,
  nodes: ForceNode[],
  direction: Direction,
): ForceNode | null {
  const fx = focused.x ?? 0;
  const fy = focused.y ?? 0;

  const candidates = nodes.filter((n) => {
    if (n.mbid === focused.mbid) return false;
    const dx = (n.x ?? 0) - fx;
    const dy = (n.y ?? 0) - fy;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    switch (direction) {
      case 'ArrowRight': return dx > 0 && ady < adx;
      case 'ArrowLeft':  return dx < 0 && ady < adx;
      case 'ArrowDown':  return dy > 0 && adx < ady;
      case 'ArrowUp':    return dy < 0 && adx < ady;
    }
  });

  if (candidates.length === 0) return null;

  return candidates.reduce((nearest, n) => {
    const ndx = (n.x ?? 0) - fx;
    const ndy = (n.y ?? 0) - fy;
    const dist = Math.sqrt(ndx * ndx + ndy * ndy);

    const nearestDx = (nearest.x ?? 0) - fx;
    const nearestDy = (nearest.y ?? 0) - fy;
    const nearestDist = Math.sqrt(nearestDx * nearestDx + nearestDy * nearestDy);

    return dist < nearestDist ? n : nearest;
  });
}
