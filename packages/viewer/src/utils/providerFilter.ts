import type { ForceNode, ForceLink } from '../types/graph.js';
import type { ProviderId } from '@similar-artists-graph/engine';

interface FilterResult {
  nodes: ForceNode[];
  links: ForceLink[];
}

/**
 * Keeps nodes with depthFromSeed <= maxDepth.
 * Links are kept only when both endpoints are in the visible set.
 */
export function filterByDepth(nodes: ForceNode[], links: ForceLink[], maxDepth: number): FilterResult {
  const visibleNodes = nodes.filter((n) => n.depthFromSeed <= maxDepth);
  const visibleMbids = new Set(visibleNodes.map((n) => n.mbid));
  const visibleLinks = links.filter(
    (l) => visibleMbids.has(l.sourceMbid) && visibleMbids.has(l.targetMbid),
  );
  return { nodes: visibleNodes, links: visibleLinks };
}

/**
 * Keeps nodes where at least one source is in enabledProviders.
 * For links: filters attribution to enabled providers only, recalculates fusedScore
 * as average of remaining rawScores. Excludes links with no remaining attribution.
 */
export function filterByProviders(
  nodes: ForceNode[],
  links: ForceLink[],
  enabledProviders: Set<ProviderId>,
): FilterResult {
  const visibleNodes = nodes.filter((n) => n.sources.some((s) => enabledProviders.has(s)));
  const visibleMbids = new Set(visibleNodes.map((n) => n.mbid));

  const visibleLinks: ForceLink[] = [];
  for (const link of links) {
    if (!visibleMbids.has(link.sourceMbid) || !visibleMbids.has(link.targetMbid)) {
      continue;
    }
    const filteredAttribution = link.attribution.filter((a) => enabledProviders.has(a.provider));
    if (filteredAttribution.length === 0) {
      continue;
    }
    const newFusedScore =
      filteredAttribution.reduce((sum, a) => sum + a.rawScore, 0) / filteredAttribution.length;
    visibleLinks.push({
      ...link,
      attribution: filteredAttribution,
      fusedScore: newFusedScore,
    });
  }

  return { nodes: visibleNodes, links: visibleLinks };
}

/**
 * Keeps seed + top N nodes by fusedScore of direct edge to seed.
 * Nodes with no direct edge to seed are scored as 0.
 * Links are kept only between visible nodes.
 */
export function filterByNodeLimit(
  nodes: ForceNode[],
  links: ForceLink[],
  seedMbid: string,
  limit: number,
): FilterResult {
  // Build a score map: node mbid -> fusedScore of edge to seed (0 if no direct edge)
  const scoreToSeed = new Map<string, number>();
  for (const link of links) {
    if (link.sourceMbid === seedMbid) {
      scoreToSeed.set(link.targetMbid, link.fusedScore);
    } else if (link.targetMbid === seedMbid) {
      scoreToSeed.set(link.sourceMbid, link.fusedScore);
    }
  }

  const seed = nodes.find((n) => n.mbid === seedMbid);
  const others = nodes.filter((n) => n.mbid !== seedMbid);

  // Sort others by score descending, take top limit
  const sorted = others.slice().sort((a, b) => {
    const scoreA = scoreToSeed.get(a.mbid) ?? 0;
    const scoreB = scoreToSeed.get(b.mbid) ?? 0;
    return scoreB - scoreA;
  });

  const topOthers = sorted.slice(0, limit);
  const visibleNodes = seed ? [seed, ...topOthers] : topOthers;
  const visibleMbids = new Set(visibleNodes.map((n) => n.mbid));

  const visibleLinks = links.filter(
    (l) => visibleMbids.has(l.sourceMbid) && visibleMbids.has(l.targetMbid),
  );

  return { nodes: visibleNodes, links: visibleLinks };
}
