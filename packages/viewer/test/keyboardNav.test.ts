import { describe, it, expect } from 'vitest';
import { findNearestInDirection, getConnectedNeighbors } from '../src/utils/keyboardNav.js';
import type { ForceNode } from '../src/types/graph.js';

function makeNode(mbid: string, x: number, y: number): ForceNode {
  return {
    mbid,
    name: mbid,
    sources: ['musicbrainz'],
    depthFromSeed: 0,
    x,
    y,
  };
}

describe('findNearestInDirection', () => {
  const focused = makeNode('focused', 0, 0);

  it('ArrowRight: finds node to the right', () => {
    const right = makeNode('right', 10, 2);
    const left = makeNode('left', -10, 1);
    const result = findNearestInDirection(focused, [focused, right, left], 'ArrowRight');
    expect(result?.mbid).toBe('right');
  });

  it('ArrowLeft: finds node to the left', () => {
    const right = makeNode('right', 10, 2);
    const left = makeNode('left', -10, 1);
    const result = findNearestInDirection(focused, [focused, right, left], 'ArrowLeft');
    expect(result?.mbid).toBe('left');
  });

  it('ArrowDown: finds node below', () => {
    const below = makeNode('below', 1, 10);
    const above = makeNode('above', 2, -10);
    const result = findNearestInDirection(focused, [focused, below, above], 'ArrowDown');
    expect(result?.mbid).toBe('below');
  });

  it('ArrowUp: finds node above', () => {
    const below = makeNode('below', 1, 10);
    const above = makeNode('above', 2, -10);
    const result = findNearestInDirection(focused, [focused, below, above], 'ArrowUp');
    expect(result?.mbid).toBe('above');
  });

  it('returns null when no candidates in direction', () => {
    const right = makeNode('right', 10, 1);
    // Only candidate is to the right, asking for left
    const result = findNearestInDirection(focused, [focused, right], 'ArrowLeft');
    expect(result).toBeNull();
  });

  it('excludes the focused node from candidates', () => {
    const result = findNearestInDirection(focused, [focused], 'ArrowRight');
    expect(result).toBeNull();
  });

  it('ArrowRight: returns closest node when multiple candidates', () => {
    const near = makeNode('near', 5, 1);
    const far = makeNode('far', 20, 2);
    const result = findNearestInDirection(focused, [focused, near, far], 'ArrowRight');
    expect(result?.mbid).toBe('near');
  });

  it('does not return node that is below-right for ArrowRight (|dy| >= |dx|)', () => {
    // This node is below-right (dy > dx in magnitude) — should NOT be a right candidate
    const belowRight = makeNode('belowRight', 5, 10);
    const result = findNearestInDirection(focused, [focused, belowRight], 'ArrowRight');
    expect(result).toBeNull();
  });
});

describe('getConnectedNeighbors', () => {
  it('returns neighbors sorted descending by fusedScore', () => {
    const nodeA = makeNode('artist-a', 0, 0);
    const nodeB = makeNode('artist-b', 1, 0);
    const nodeC = makeNode('artist-c', 2, 0);

    const links = [
      { sourceMbid: 'artist-a', targetMbid: 'artist-b', fusedScore: 0.8 },
      { sourceMbid: 'artist-a', targetMbid: 'artist-c', fusedScore: 0.5 },
    ];
    const nodes = [nodeA, nodeB, nodeC];

    const result = getConnectedNeighbors('artist-a', links, nodes);
    expect(result).toHaveLength(2);
    expect(result[0]!.mbid).toBe('artist-b');
    expect(result[1]!.mbid).toBe('artist-c');
  });

  it('returns empty array when no matching nodes exist in nodes array', () => {
    const links = [
      { sourceMbid: 'artist-a', targetMbid: 'artist-b', fusedScore: 0.8 },
    ];
    const nodes = [makeNode('artist-a', 0, 0)]; // artist-b not in nodes

    const result = getConnectedNeighbors('artist-a', links, nodes);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when links array is empty', () => {
    const nodes = [makeNode('artist-x', 0, 0), makeNode('artist-y', 1, 0)];
    const result = getConnectedNeighbors('artist-x', [], nodes);
    expect(result).toHaveLength(0);
  });

  it('includes both sourceMbid and targetMbid edges (undirected lookup)', () => {
    const nodeA = makeNode('artist-a', 0, 0);
    const nodeB = makeNode('artist-b', 1, 0);
    const nodeC = makeNode('artist-c', 2, 0);

    // artist-a is targetMbid in first link, sourceMbid in second
    const links = [
      { sourceMbid: 'artist-b', targetMbid: 'artist-a', fusedScore: 0.9 },
      { sourceMbid: 'artist-a', targetMbid: 'artist-c', fusedScore: 0.4 },
    ];
    const nodes = [nodeA, nodeB, nodeC];

    const result = getConnectedNeighbors('artist-a', links, nodes);
    expect(result).toHaveLength(2);
    const mbids = result.map(n => n.mbid);
    expect(mbids).toContain('artist-b');
    expect(mbids).toContain('artist-c');
    // artist-b has score 0.9, artist-c has score 0.4 -> b comes first
    expect(result[0]!.mbid).toBe('artist-b');
  });
});
