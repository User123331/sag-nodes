---
phase: 07-visual-polish-and-animations
plan: 03
subsystem: viewer/canvas-animation
tags: [animation, canvas, particles, d3-force, simulation, neighbor-highlight]
dependency_graph:
  requires: ["07-02"]
  provides: ["stable-simulation", "uniform-particles", "neighbor-opacity-highlight"]
  affects: ["packages/viewer/src/components/GraphCanvas.tsx", "packages/viewer/src/utils/animationMath.ts"]
tech_stack:
  added: []
  patterns: ["d3AlphaDecay=0.0228 for natural simulation cooling", "autoPauseRedraw=false keeps canvas loop alive without reheating", "neighborMbidsRef tracks connected nodes for selected artist", "opacity contrast (0.7 neighbors / 0.3 unrelated) as visual neighbor indicator"]
key_files:
  modified:
    - packages/viewer/src/components/GraphCanvas.tsx
    - packages/viewer/src/utils/animationMath.ts
key_decisions:
  - "d3AlphaDecay restored to 0.0228 (was 0) so simulation cools naturally after layout stabilizes — prevents perpetual node wiggle"
  - "setInterval reheat useEffect removed entirely — was the root cause of perpetual wiggle by unconditionally reheating every 5s"
  - "autoPauseRedraw=false added to ForceGraph2D to keep canvas render loop alive for particles — replaces the role previously served by the now-removed reheat interval"
  - "cycleDuration fixed to constant 2500ms (was 1500-4000ms based on fusedScore) — all particles move at uniform speed"
  - "PARTICLE_RADIUS reduced from 0.4 to 0.25 — particles are now imperceptibly small dots"
  - "neighborMbidsRef tracks connected node mbids via useEffect on selectedNode+links — avoids stale closure in canvas callback"
  - "Neighbor rings removed after UAT — white stroke ring at radius+3 occluded artist name labels; opacity difference (0.7 vs 0.3) is sufficient visual indicator"
patterns-established:
  - "neighborMbidsRef pattern: mutable ref updated via useEffect, read inside canvas callbacks to avoid stale closure"
  - "autoPauseRedraw=false is the correct mechanism for continuous canvas animation — cooldownTicks=Infinity alone is not sufficient"
requirements-completed: []
metrics:
  duration: 15 min
  completed_date: "2026-03-18"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 2
---

# Phase 7 Plan 03: Visual UAT Fixes Summary

**Simulation stability restored (d3AlphaDecay=0.0228, reheat interval removed), particles shrunk to 0.25px with uniform 2500ms cycle speed, and neighbor nodes highlighted at 70% opacity vs 30% for unrelated nodes on selection.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-17T23:50:03Z
- **Completed:** 2026-03-18T00:05:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Nodes now settle into a stable layout and stop moving after the force simulation cools — the 5-second reheat `setInterval` was the root cause of perpetual wiggle
- Particles are visually imperceptible tiny dots (0.25px radius) all moving at the same pace regardless of edge strength
- Double-clicking a node clearly distinguishes connected neighbors (70% opacity) from unrelated nodes (30% opacity) without obscuring labels

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix node wiggle — restore d3AlphaDecay and remove reheat interval** - `36284f7` (fix)
2. **Task 2: Fix particle size and uniform speed; add neighbor highlight rings** - `fa93ab1` (feat)
3. **Task 3 (post-checkpoint): Remove neighbor rings that occluded labels** - `980f62b` (fix)

## Files Created/Modified

- `packages/viewer/src/components/GraphCanvas.tsx` — removed reheat setInterval, added `autoPauseRedraw={false}`, restored `d3AlphaDecay={0.0228}`, fixed `cycleDuration=2500`, added `neighborMbidsRef` + `isNeighbor` opacity logic
- `packages/viewer/src/utils/animationMath.ts` — `PARTICLE_RADIUS` changed from `0.4` to `0.25`

## Decisions Made

- `setInterval` reheat block removed: it unconditionally called `d3ReheatSimulation()` every 5 seconds, making nodes wiggle indefinitely after layout stabilized. The conditional `reheatCounter` useEffect (triggered by DetailPanel expand) is correct and was left in place.
- `autoPauseRedraw={false}` added to ForceGraph2D: `cooldownTicks={Infinity}` prevents the simulation tick loop from stopping but does not keep the canvas renderer running — `autoPauseRedraw={false}` is the correct prop for continuous redraws.
- Neighbor rings dropped after visual review: the white stroke ring at `radius+3` overlapped artist name labels positioned at `y + radius + 2`, making them unreadable. Opacity difference alone (0.7 for neighbors vs 0.3 for unrelated) provides sufficient visual contrast.

## Deviations from Plan

### User-requested Adjustments

**1. [Post-checkpoint] Neighbor highlight ring removed to prevent label occlusion**
- **Found during:** Task 3 (human-verify checkpoint, user visual review)
- **Issue:** The white stroke ring drawn at `radius+3` overlapped artist name labels drawn at `y + radius + 2`, making neighbor node names unreadable
- **Fix:** Removed the `if (isNeighbor)` ring draw block from `renderNode`; opacity difference (0.7 neighbors / 0.3 unrelated) retained as the sole visual indicator
- **Files modified:** `packages/viewer/src/components/GraphCanvas.tsx`
- **Commit:** 980f62b

---

**Total deviations:** 1 user-requested adjustment (post-checkpoint visual review)
**Impact on plan:** Ring removal preserves label readability. The functional goal — visually distinguishing neighbors from unrelated nodes — is still achieved via opacity contrast.

## Issues Encountered

None beyond the ring/label occlusion discovered during visual review.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three UAT-reported visual regressions resolved
- Graph canvas is visually stable and polished
- No known remaining visual issues from Phase 7 UAT

---
*Phase: 07-visual-polish-and-animations*
*Completed: 2026-03-18*
