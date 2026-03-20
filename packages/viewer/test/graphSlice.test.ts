import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createGraphSlice, type GraphSlice } from '../src/store/graphSlice.js';
import type { ExploreResult } from '@similar-artists-graph/engine';
import { toForceNode } from '../src/types/graph.js';

function makeMockResult(overrides: Partial<ExploreResult> = {}): ExploreResult {
  return {
    seedMbid: 'seed-001',
    truncated: false,
    nodeCount: 3,
    edgeCount: 2,
    warnings: [],
    nodes: [
      {
        mbid: 'node-001',
        name: 'Artist One',
        sources: ['musicbrainz'],
        metadata: { nb_fan: 10000 },
      },
      {
        mbid: 'node-002',
        name: 'Artist Two',
        sources: ['lastfm'],
      },
      {
        mbid: 'node-003',
        name: 'Artist Three',
        sources: ['deezer'],
        metadata: { deezerId: 'dz-3' },
      },
    ],
    edges: [
      {
        sourceMbid: 'node-001',
        targetMbid: 'node-002',
        fusedScore: 0.8,
        attribution: [{ provider: 'musicbrainz', rawScore: 0.8 }],
      },
      {
        sourceMbid: 'node-001',
        targetMbid: 'node-003',
        fusedScore: 0.6,
        attribution: [{ provider: 'lastfm', rawScore: 0.6 }],
      },
    ],
    ...overrides,
  };
}

describe('graphSlice', () => {
  it('setGraph populates nodes, links, seedMbid from mock ExploreResult', () => {
    const store = create<GraphSlice>()(createGraphSlice);
    store.getState().setGraph(makeMockResult());

    const state = store.getState();
    expect(state.nodes).toHaveLength(3);
    expect(state.links).toHaveLength(2);
    expect(state.seedMbid).toBe('seed-001');
  });

  it('setGraph maps ArtistNode to ForceNode correctly (mutable, no readonly)', () => {
    const store = create<GraphSlice>()(createGraphSlice);
    store.getState().setGraph(makeMockResult());

    const node = store.getState().nodes[0];
    expect(node.mbid).toBe('node-001');
    expect(node.name).toBe('Artist One');
    expect(node.metadata?.nb_fan).toBe(10000);

    // ForceNode should be mutable — can assign x/y without TypeScript error
    node.x = 100;
    node.y = 200;
    expect(node.x).toBe(100);
    expect(node.y).toBe(200);
  });

  it('setGraph sets truncated from ExploreResult', () => {
    const store = create<GraphSlice>()(createGraphSlice);
    store.getState().setGraph(makeMockResult({ truncated: true }));

    expect(store.getState().truncated).toBe(true);
  });

  it('addExpansion merges new nodes without duplicating existing mbids', () => {
    const store = create<GraphSlice>()(createGraphSlice);
    store.getState().setGraph(makeMockResult());

    const expandingNode = store.getState().nodes[0];
    const expansionResult = makeMockResult({
      seedMbid: 'node-001',
      nodes: [
        ...makeMockResult().nodes,
        { mbid: 'node-004', name: 'Artist Four', sources: ['musicbrainz'] },
      ],
      edges: [
        ...makeMockResult().edges,
        {
          sourceMbid: 'node-001',
          targetMbid: 'node-004',
          fusedScore: 0.5,
          attribution: [],
        },
      ],
      nodeCount: 4,
      edgeCount: 3,
    });

    store.getState().addExpansion(expansionResult, expandingNode);
    const state = store.getState();
    expect(state.nodes).toHaveLength(4);

    const mbids = state.nodes.map(n => n.mbid);
    const unique = new Set(mbids);
    expect(unique.size).toBe(4);
  });

  it('addExpansion sets new nodes x/y to expanding node position', () => {
    const store = create<GraphSlice>()(createGraphSlice);
    store.getState().setGraph(makeMockResult());

    const expandingNode = store.getState().nodes[0];
    expandingNode.x = 50;
    expandingNode.y = 75;

    const expansionResult = makeMockResult({
      nodes: [
        ...makeMockResult().nodes,
        { mbid: 'node-new', name: 'New Artist', sources: ['musicbrainz'] },
      ],
      edges: [],
      nodeCount: 4,
      edgeCount: 0,
    });

    store.getState().addExpansion(expansionResult, expandingNode);
    const newNode = store.getState().nodes.find(n => n.mbid === 'node-new');

    expect(newNode).toBeDefined();
    expect(newNode?.x).toBe(50);
    expect(newNode?.y).toBe(75);
  });

  it('addExpansion does not duplicate links with same sourceMbid-targetMbid pair', () => {
    const store = create<GraphSlice>()(createGraphSlice);
    store.getState().setGraph(makeMockResult());

    const expandingNode = store.getState().nodes[0];

    // Expand with a result that has the same edges as the initial graph
    const expansionResult = makeMockResult({
      nodes: [
        ...makeMockResult().nodes,
        { mbid: 'node-005', name: 'Artist Five', sources: [] },
      ],
      edges: [
        ...makeMockResult().edges, // same links — should be deduped
        {
          sourceMbid: 'node-001',
          targetMbid: 'node-005',
          fusedScore: 0.3,
          attribution: [],
        },
      ],
      nodeCount: 4,
      edgeCount: 3,
    });

    store.getState().addExpansion(expansionResult, expandingNode);

    const state = store.getState();
    // Should have original 2 links + 1 new link = 3 total (not 4+)
    expect(state.links).toHaveLength(3);
  });

  it('addExpansion sets addedAt on new nodes', () => {
    const store = create<GraphSlice>()(createGraphSlice);
    store.getState().setGraph(makeMockResult());

    const expandingNode = store.getState().nodes[0];
    const beforeExpansion = Date.now();

    const expansionResult = makeMockResult({
      nodes: [
        ...makeMockResult().nodes,
        { mbid: 'node-new-at', name: 'New Artist addedAt', sources: ['musicbrainz'] },
      ],
      edges: [],
      nodeCount: 4,
      edgeCount: 0,
    });

    store.getState().addExpansion(expansionResult, expandingNode);
    const afterExpansion = Date.now();

    const newNode = store.getState().nodes.find(n => n.mbid === 'node-new-at');
    expect(newNode).toBeDefined();
    expect(typeof newNode?.addedAt).toBe('number');
    expect(newNode?.addedAt).toBeGreaterThanOrEqual(beforeExpansion);
    expect(newNode?.addedAt).toBeLessThanOrEqual(afterExpansion);

    // Existing nodes should not have addedAt set
    const existingNode = store.getState().nodes.find(n => n.mbid === 'node-001');
    expect(existingNode?.addedAt).toBeUndefined();
  });

  it('toForceNode carries externalUrls when present on the input ArtistNode', () => {
    const artistNode = {
      mbid: 'mbid-ext-001',
      name: 'Radiohead',
      sources: ['musicbrainz' as const],
      externalUrls: [
        { type: 'wikidata', url: 'https://www.wikidata.org/wiki/Q164813' },
        { type: 'official homepage', url: 'https://radiohead.com' },
      ],
    };
    const forceNode = toForceNode(artistNode);
    expect(forceNode.externalUrls).toBeDefined();
    expect(forceNode.externalUrls).toHaveLength(2);
    expect(forceNode.externalUrls![0]).toEqual({ type: 'wikidata', url: 'https://www.wikidata.org/wiki/Q164813' });
  });

  it('toForceNode omits externalUrls when not present on the input ArtistNode', () => {
    const artistNode = {
      mbid: 'mbid-no-ext',
      name: 'Portishead',
      sources: ['lastfm' as const],
    };
    const forceNode = toForceNode(artistNode);
    expect('externalUrls' in forceNode).toBe(false);
  });

  it('clearGraph resets all fields to initial state', () => {
    const store = create<GraphSlice>()(createGraphSlice);
    store.getState().setGraph(makeMockResult());
    store.getState().clearGraph();

    const state = store.getState();
    expect(state.nodes).toHaveLength(0);
    expect(state.links).toHaveLength(0);
    expect(state.seedMbid).toBeNull();
    expect(state.truncated).toBe(false);
  });
});
