---
phase: 05-fix-integration-wiring
plan: "02"
subsystem: ui
tags: [react, zustand, canvas, rate-limiting, force-graph]

# Dependency graph
requires:
  - phase: 04-controls-export-and-polish
    provides: ControlPanel with providerCooldownEndsAt display + controlSlice setProviderCooldown action
  - phase: 05-fix-integration-wiring
    provides: plan 05-01 exploreByMbid wiring context
provides:
  - Rate-limit cooldown dispatch from handleExpand when RateLimitError warning is encountered
  - Auto-clear countdown timer resets cooldown badge after 30s default delay
  - resetControls clears providerCooldownEndsAt to prevent stale badges on graph reset
  - Edge thickness scaled by fusedScore (0.5px weak to 1.5px strong) with 1.5x selection boost
affects: [viewer rendering, provider status display, ControlPanel cooldown badges]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cooldown timer tracking via useRef<Map<string, ReturnType<typeof setTimeout>>> with cleanup on unmount"
    - "RateLimitError string-kind check in warnings array (error is kind string, not full ProviderError object)"
    - "Screen-space edge width: (baseWidth * selectionBoost) / globalScale mirrors renderNode established pattern"
    - "connectedToSelected extracted as standalone variable — reused for both opacity dimming and width boost"

key-files:
  created: []
  modified:
    - packages/viewer/src/components/GraphCanvas.tsx
    - packages/viewer/src/store/controlSlice.ts

key-decisions:
  - "30s DEFAULT_COOLDOWN_MS hardcoded — retryAfterMs not available in warnings (error is kind string, not ProviderError object)"
  - "selectionBoost=1.5x multiplier applied to edge width matching selection ring visual weight"
  - "connectedToSelected computed once and reused for both opacity and lineWidth to avoid double calculation"

patterns-established:
  - "RateLimitError string-kind dispatch pattern: check w.error === 'RateLimitError', dispatch cooldown+status, auto-clear with setTimeout"

requirements-completed: [STAT-02, VIS-04]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 5 Plan 02: Fix Rate-Limit Cooldown Dispatch and Edge Thickness Summary

**Rate-limit cooldown badges now dispatch from handleExpand on RateLimitError with 30s auto-clear, and edge thickness scales from 0.5px (weak) to 1.5px (strong) similarity with 1.5x boost on selected node edges.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T09:44:30Z
- **Completed:** 2026-03-17T09:46:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- handleExpand now detects `RateLimitError` in warnings and dispatches `setProviderCooldown` with 30s cooldown — ControlPanel rate-limit badges finally appear
- Auto-clear setTimeout resets both cooldown timestamp and provider status after 30s, with cleanup on unmount via cooldownTimersRef
- resetControls clears `providerCooldownEndsAt: {}` so graph reset removes stale cooldown indicators
- Edge lineWidth scales with fusedScore (0.5+fusedScore) giving 0.5px for weak similarity and 1.5px for strong, with 1.5x boost on selected node's direct edges

## Task Commits

1. **Task 1: Wire rate-limit cooldown dispatch in handleExpand (STAT-02)** - `86eb680` (feat)
2. **Task 2: Scale edge thickness by fusedScore with selection boost (VIS-04)** - `8de446a` (feat)

## Files Created/Modified
- `packages/viewer/src/components/GraphCanvas.tsx` - Added setProviderCooldown action, cooldownTimersRef, cleanup effect, RateLimitError branch in handleExpand warning loop, dynamic edge lineWidth
- `packages/viewer/src/store/controlSlice.ts` - Added providerCooldownEndsAt: {} to resetControls

## Decisions Made
- Used 30s DEFAULT_COOLDOWN_MS hardcoded constant because `retryAfterMs` is not available in warnings — the `error` field is a kind string (e.g. `'RateLimitError'`), not a full ProviderError object
- selectionBoost=1.5x for edge width matches visual weight of the selection ring indicator
- connectedToSelected extracted as standalone variable at top of renderLink to avoid computing it twice for opacity and lineWidth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - both changes were clean last-mile wiring, no type errors, all 91 tests passed, build succeeded.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Rate-limit cooldown badges visible in ControlPanel when providers hit limits
- Edge thickness visually differentiates high vs low similarity pairs
- Phase 5 integration wiring fixes complete — ready for Phase 6 (UAT gap closure or further polish)

## Self-Check: PASSED
- GraphCanvas.tsx: FOUND
- controlSlice.ts: FOUND
- SUMMARY.md: FOUND
- Commit 86eb680: FOUND
- Commit 8de446a: FOUND

---
*Phase: 05-fix-integration-wiring*
*Completed: 2026-03-17*
