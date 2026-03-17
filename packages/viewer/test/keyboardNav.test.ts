import { describe, it, expect } from 'vitest';
import { findNearestInDirection } from '../src/utils/keyboardNav.js';
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
