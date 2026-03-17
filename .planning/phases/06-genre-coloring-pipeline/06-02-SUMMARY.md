---
phase: 06-genre-coloring-pipeline
plan: 02
subsystem: viewer
tags: [genre-coloring, canvas-rendering, detail-panel, tdd]
requires: ["06-01"]
provides: ["VIS-03"]
affects: ["packages/viewer/src/utils/genreCluster.ts", "packages/viewer/src/types/graph.ts", "packages/viewer/src/components/GraphCanvas.tsx", "packages/viewer/src/components/DetailPanel.tsx"]
tech-stack:
  added: []
  patterns: ["HSL hash deterministic coloring", "ctx.save/restore shadow isolation", "TagEntry union type"]
key-files:
  created: []
  modified:
    - packages/viewer/src/utils/genreCluster.ts
    - packages/viewer/src/types/graph.ts
    - packages/viewer/src/components/GraphCanvas.tsx
    - packages/viewer/src/components/DetailPanel.tsx
    - packages/viewer/test/genreCluster.test.ts
decisions:
  - "HSL hash (djb2 variant) chosen over Tableau10 family mapping — deterministic per tag name, infinite color space, no category maintenance"
  - "ctx.save/restore wraps genre ring shadow to prevent shadow leak to subsequent node draws"
  - "NO_GENRE_COLOR not imported in DetailPanel — genreColor([]) returns it transparently"
metrics:
  duration: 4
  completed_date: "2026-03-17T19:01:39Z"
  tasks: 2
  files: 5
---

# Phase 6 Plan 2: Genre Coloring — HSL Hash, Neon Rings, and Detail Badges Summary

**One-liner:** HSL hash-based genreColor replaces Tableau10 family mapping; graph nodes display neon genre rings; detail panel shows up to 8 colored genre badges and genre-colored connected-artist dots.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Replace genreCluster.ts with HSL hash; update tests (TDD) | ff38085 | genreCluster.ts, genreCluster.test.ts |
| 2 | Add tags to ForceNode, neon ring in GraphCanvas, badges in DetailPanel | 1664091 | graph.ts, GraphCanvas.tsx, DetailPanel.tsx |

## What Was Built

### genreCluster.ts (complete rewrite)
Replaced the `GENRE_FAMILIES`/`tagToFamily`/`schemeTableau10` pipeline with a minimal djb2-variant hash that maps any tag name to a deterministic HSL hue (0–359°). The `TagEntry` union type accepts both `{name, count}` objects (MusicBrainz shape) and plain strings (Spotify genre shape). `genreColor([])` returns `NO_GENRE_COLOR` (`#4a4a4a`). Same tag, same color — always.

### ForceNode.tags
Added `tags?: ReadonlyArray<{ name: string; count: number }>` to `ForceNode`. `toForceNode()` propagates `node.tags` via conditional spread (satisfies `exactOptionalPropertyTypes`).

### GraphCanvas neon ring
After the node fill, before the seed ring: a `ctx.save()`-wrapped arc at `radius + 1`, `lineWidth = 1.5`, `shadowBlur = 3` with the genre color. Non-selected nodes in selection mode get `globalAlpha = 0.3` (matches existing dimming pattern). `ctx.restore()` clears the shadow so it doesn't bleed to adjacent draws.

### DetailPanel genre badges
Genre section inserted after disambiguation, before fan count. Renders up to 8 tags using translucent background (`hsla(..., 0.2)`) and solid text in the genre color. Tags are title-cased via a `titleCase()` helper. Connected-artist colored dots now call `genreColor(connNode.tags ?? [])` instead of the flat `NO_GENRE_COLOR`.

## Verification

- `pnpm --filter @similar-artists-graph/viewer test run` — 91/91 tests pass
- `pnpm --filter @similar-artists-graph/viewer build` — exits 0 (TypeScript + Vite)
- genreCluster.ts: no `schemeTableau10`, no `GENRE_FAMILIES`, no `tagToFamily`
- GraphCanvas.tsx: `ctx.shadowBlur = 3`, `ctx.save()`, `ctx.restore()`, `radius + 1`, `lineWidth = 1.5`
- DetailPanel.tsx: `genre-badge`, `node.tags.slice(0, 8)`, `titleCase`, `genreColor(connNode.tags ?? [])`
- ForceNode: `tags?: ReadonlyArray<{ name: string; count: number }>`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- genreCluster.ts: FOUND
- graph.ts: FOUND
- GraphCanvas.tsx: FOUND
- DetailPanel.tsx: FOUND
- Commit ff38085: FOUND
- Commit 1664091: FOUND
