# Requirements: Similar Artists Graph Engine

**Defined:** 2026-03-19
**Core Value:** Anyone can type an artist name and instantly explore their relational neighborhood as a rich, interactive graph with cross-platform metadata depth.

## v1.1 Requirements

Requirements for UX Polish & Data Completeness milestone. Each maps to roadmap phases.

### Node Budget

- [ ] **BUDG-01**: Node limit slider range is 64-512 (was 10-200)
- [ ] **BUDG-02**: Node limit slider value propagates to engine GraphBuilder maxNodes (not just client-side filtering)
- [ ] **BUDG-03**: Node limit toast notification shows actual configured limit, not hardcoded 150

### Navigation

- [ ] **NAV-01**: Arrow key navigation uses spatial/directional mode in both main view and detail panel view (no topology-only mode when panel open)

### External Links

- [ ] **LINK-01**: Engine stores MusicBrainz external URLs (Spotify, Deezer, YouTube, ListenBrainz, etc.) in ArtistNode metadata
- [ ] **LINK-02**: Detail panel renders all available external links from stored metadata

### Visual Tuning

- [ ] **VIS-01**: Artist label font size 2x larger, adaptive zoom scaling preserved
- [ ] **VIS-02**: Genre outline reduced to thin border (smaller lineWidth, reduced/no shadow glow)

### Panel Behavior

- [ ] **PANL-01**: Left panel (ControlPanel) uses manual (x) toggle instead of auto-collapse timer
- [ ] **PANL-02**: Left panel retains minimized view when collapsed
- [ ] **PANL-03**: Right panel has minimized view with icon to reopen
- [ ] **PANL-04**: Right panel minimized view shows node count and artist list when no artist selected; shows artist details when selected

### Animation Controls

- [ ] **ANIM-01**: Particle animation off by default
- [ ] **ANIM-02**: Animation toggle in control panel to enable/disable particles

## v1.0 Requirements (Complete)

All 63 v1.0 requirements shipped. See git history for full traceability.

### Infrastructure (5) ✓
### Providers (7) ✓
### Identity Resolution (3) ✓
### Graph Engine (6) ✓
### Rate Limiting & Caching (4) ✓
### Visualization (8) ✓
### Search (3) ✓
### Detail Panel (6) ✓
### Control Panel (6) ✓
### Provider Status (3) ✓
### Export (2) ✓
### Sharing & Navigation (2) ✓
### Packaging (4) ✓
### UI/UX (4) ✓

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Alternative graph layouts (hierarchical, concentric)
- **ADV-02**: Graph filtering by genre, provider, popularity threshold
- **ADV-03**: Artist comparison mode (side-by-side neighborhood graphs)
- **ADV-04**: Light theme option
- **ADV-05**: LocalStorage auto-save of last session

## Out of Scope

| Feature | Reason |
|---------|--------|
| SoundCharts API | $250/mo minimum, 1K trial only, wraps Spotify data -- not independent signal |
| New Spotify endpoints | Related artists endpoint restricted to dev mode (5 users); already implemented as optional fallback |
| Demo/seed data mode | User explicitly requires live data only -- no fake/pre-cached data |
| User accounts / saved graphs | Authentication, database, GDPR -- scope creep for localhost tool |
| Playlist generation | Requires streaming platform write access, mixes discovery with consumption |
| Real-time collaborative exploration | WebSocket infrastructure, session management -- massive complexity |
| 3D visualization | Occlusion, navigation complexity, no analytical benefit over 2D |
| Audio preview on hover | Streaming rights, hostile UX, API complexity per track |
| Mobile native app | Desktop-first for data exploration; responsive web is sufficient |
| Historical graph snapshots | Requires persistent storage, periodic re-fetching infrastructure |
| Proprietary scoring algorithms | Momentum/breakout scores belong in future paid dashboard, not open-source |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUDG-01 | Phase 9 | Pending |
| BUDG-02 | Phase 8 | Pending |
| BUDG-03 | Phase 8 | Pending |
| NAV-01 | Phase 9 | Pending |
| LINK-01 | Phase 8 | Pending |
| LINK-02 | Phase 10 | Pending |
| VIS-01 | Phase 9 | Pending |
| VIS-02 | Phase 9 | Pending |
| PANL-01 | Phase 10 | Pending |
| PANL-02 | Phase 10 | Pending |
| PANL-03 | Phase 10 | Pending |
| PANL-04 | Phase 10 | Pending |
| ANIM-01 | Phase 9 | Pending |
| ANIM-02 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation*
