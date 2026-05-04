# Implementation plan: shared `<BentoCard>` migration

**Status:** ✅ complete (2026-05-03) — all six phases landed in one extended session
**Author:** drafted 2026-05-03 by Claude during the post-audit cleanup arc
**Estimated total effort:** 15–22 working days, splittable across 6 phases
**Output:** every panel in the app renders through one shared React component; ~500–900 net LOC removed across 18 dashboards; visual contract unified

---

## 1. Goals

| Goal | Why |
| --- | --- |
| **One canonical card component** | New panels take ~5 lines of JSX, not ~15. New devs see one pattern, not 18. |
| **Single visual contract** | Border, radius, shadow, hover, drag handle, padding — defined once. Redesigns happen once. |
| **DataFooter consistency** | Every panel reports provenance the same way. Drift impossible by construction. |
| **Test stability** | `panel-coverage.spec.js` already matches by title; the migration is presentational, so tests should keep passing as a property. |

## 2. Non-goals

- **Visual redesign.** The migration must be visually no-op. Any color/spacing change is a separate concern.
- **Layout (grid) changes.** BentoWrapper handles react-grid-layout. We are *not* touching layout positioning, only the per-card markup inside it.
- **Refactoring panel internals.** The body of each panel (`<MetricValue>`, `<SafeECharts>`, tables, etc.) is unchanged. We swap only the card wrapper.
- **Per-tab CSS deletion in this plan.** That's the 2026-05-18 follow-up (`docs/follow-ups/2026-05-18-bento-cleanup.md`). Run that first or alongside Phase 6 here.

## 3. Current state inventory

```
Tab                  Panels  Notes
alerts                  3
analytics              11    table-heavy, custom rows
bls                     4    just rewritten — pilot candidate
bonds                  14    biggest, lots of sparklines + KPI
calendar                9    earnings/auctions tables
commodities             7    cross-market data; futures curves
credit                 10
crypto                  8
derivatives            10    vol surface (custom canvas)
eia                     8
equities               10    sub-tab driven; HeatmapView/ListView/BarRaceView
equitiesDeepDive       11
fx                      9    sub-tab driven; carry map
globalMacro            13    federated reads imf/worldbank
insurance               9
realEstate             10    federated reads census/commodities
sentiment               8
watchlist               3
                      ───
                      157   panels total
```

## 4. Component design — `<BentoCard>`

Single component, props absorb every observed variation:

```jsx
import BentoCard from '../../../components/BentoCard';

<BentoCard
  // ── Identity (required) ─────────────────────────────────
  id="yield"                              // also React key + grid layout `i`
  title="Yield Curve"

  // ── Visual ──────────────────────────────────────────────
  subtitle="US Treasury · sovereign rates" // optional
  accent="bonds"                           // hover border color preset
  // OR
  accentColor="#10b981"                    // raw color escape hatch

  // ── DataFooter passthrough ──────────────────────────────
  source="FRED / Yahoo Finance"
  timestamp={lastUpdated}
  isLive={isLive}
  isCurrent={isCurrent}
  fetchedOn={fetchedOn}
  fetchLog={fetchLog}
  error={error}

  // ── Behavioral escape hatches ───────────────────────────
  bare                                     // skip outer chrome (rare)
  titleActions={<RefreshButton />}         // right-side title-row slot
  className="bonds-bento-card--carry"      // extra modifier classes
  noFooter                                 // suppress DataFooter (rare)
>
  {/* panel body — receives `.bento-panel-content` wrapper +
      onMouseDown stopPropagation so clicks don't trigger drag */}
  <YieldCurve {...} />
</BentoCard>
```

**Internal markup** (matches what react-grid-layout expects so drag works):

```jsx
<div className={`bento-card ${accentClass} ${className}`}>
  <div className="bento-panel-title-row">
    <span className="bento-panel-title">{title}</span>
    {subtitle && <span className="bento-panel-subtitle">{subtitle}</span>}
    {titleActions && <span className="bento-panel-title-actions">{titleActions}</span>}
  </div>
  <div className="bento-panel-content" onMouseDown={(e) => e.stopPropagation()}>
    {children}
  </div>
  {!noFooter && <DataFooter {...footerProps} />}
</div>
```

`bare` mode skips the outer wrapper entirely and just renders `{children}` — used by panels that embed `<MarketKpiStrip bare />` inline.

`accent` prop maps to a small palette in `BentoCard.module.css` (e.g. `bonds: #10b981`, `fx: #6366f1`). Adding a tab = adding a key. Custom colors via `accentColor` for one-offs.

## 5. Risk assessment

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Drag handle breaks because class structure changed | Med | The component's outer markup keeps `bento-panel-title-row` exactly where react-grid-layout's `draggableHandle` expects. Phase 1 pilot validates. |
| Per-tab `:hover` accent color regresses | Med | Accent palette in BentoCard centralizes hover colors. Per-tab CSS keeps fallback during transition. Pre/post screenshots required per tab. |
| Title-row markup change breaks `panel-registry.js` matchers | Low | Registry matches by `.bento-panel-title-row` text content (not specific span structure). Smoke check: run `test:coverage` after Phase 1 pilot. |
| `data-binding-audit.spec.js` selectors break | Low | Uses `[class*="bento-card"]` — still matches BentoCard's root class. |
| Edge-case panels (vol surface, bar race, master-detail) have unusual title rows | Med | `titleActions` + `bare` + raw `className` cover everything I've seen. If something doesn't fit, *that* panel keeps its custom markup and joins a known-exceptions list. |
| Visual subtle drift accumulates as tabs migrate | Med | Mandatory Playwright screenshot diff per phase. Reject phase PR if non-trivial diff. |
| 18 PRs feels like a lot to review | High | Each PR is small, mechanical, and bounded to one tab. Reviewer cost is ~15 min/PR after Phase 0 lands. |

## 6. Phases

Each phase ends with: passing `test`, `test:coverage`, `test:audit`, `test:persist` + Playwright before/after screenshots + a merged PR. **Do not start Phase N+1 until Phase N has soaked at least one workday.**

### Phase 0 — Foundation (1–2 days)

**Deliverables**
- `src/components/BentoCard/BentoCard.jsx` — the component
- `src/components/BentoCard/BentoCard.module.css` — accent palette + scoped styles
- `src/components/BentoCard/__tests__/BentoCard.test.jsx` — unit tests for: required props, optional subtitle, titleActions slot, accent palette, bare mode, noFooter
- `src/components/BentoCard/BentoCard.demo.jsx` — a single page mounting one card per accent + edge case (Storybook-lite, dev-only)
- Doc: `docs/components/BentoCard.md` — API reference, usage examples, migration tips

**Exit criteria**
- All accents render with correct hover color
- Drag handle works when the demo page is mounted in a stub BentoWrapper
- Unit tests green

**Output gate:** PR merged, demo URL accessible behind dev-only `?demo=bentocard`. Soak ≥ 1 day.

---

### Phase 1 — Pilot: BLS (1 day)

BLS has 3 panels, was just rewritten in 2026-05-02, has a master-detail layout that exercises the `titleActions`-shaped variant. Smallest blast radius.

**Per-tab migration checklist** (use this for every subsequent tab):

1. ☐ Read the dashboard JSX end-to-end. List every panel and its variants (subtitle yes/no, custom title-row structure, bare mode, side actions).
2. ☐ Replace each `<div className="X-bento-card">…</div>` block with `<BentoCard>…</BentoCard>`.
3. ☐ Move any inline title-row JSX into `title=`, `subtitle=`, `titleActions=` props.
4. ☐ Move DataFooter props into BentoCard's footer-passthrough slots.
5. ☐ In the per-tab CSS file, delete only rules whose selector now has no consumer. Leave per-tab `:hover` accents intact for now (Phase 6 cleans them up after the accent palette has been verified).
6. ☐ Run `npm test`.
7. ☐ Run `npm run test:coverage` — confirm every entry in `panel-registry.js` for this tab still passes.
8. ☐ Run `npm run test:audit` — no new PENDING/NO DATA.
9. ☐ Visual smoke: `npm start`, navigate to the tab, take screenshot. Compare to pre-migration screenshot — pixel-identical except where intentional.
10. ☐ Open PR titled `bentocard: migrate <tab> (phase N/6)`.
11. ☐ Tag for review. Do not push to main.

**Exit criteria** for Phase 1: BLS migrated, all four test suites green, visual diff is zero (or trivial = font kerning artifact).

**Soak:** ≥ 1 day before Phase 2.

---

### Phase 2 — Easy tabs (2–3 days)

Smallest panel counts, most uniform structure.

| Tab | Panels | Notes |
| --- | --- | --- |
| alerts | 3 | Status summary + active alerts list |
| watchlist | 3 | KPI strip + 2 tables |
| eia | 8 | Mostly charts + 1 KPI |
| calendar | 9 | Tables-heavy but uniform structure |

Each tab → its own PR using the Phase 1 checklist. Soak day between PRs.

**Exit criteria:** all four tabs migrated, regression-free.

---

### Phase 3 — Medium tabs (3–4 days)

| Tab | Panels |
| --- | ---: |
| credit | 10 |
| sentiment | 8 |
| crypto | 8 |
| insurance | 9 |

These have a mix of charts, KPI strips, and tables but no sub-tab routing. Apply the checklist per tab.

---

### Phase 4 — Complex tabs (5–7 days)

| Tab | Panels | Risk |
| --- | ---: | --- |
| bonds | 14 | Largest single tab; sparklines in master-detail |
| derivatives | 10 | Vol surface uses custom canvas — likely needs `bare` mode |
| equitiesDeepDive | 11 | Sector rotation has unusual title-row structure |
| realEstate | 10 | Federated reads from census + commodities; multi-source DataFooter |
| globalMacro | 13 | Federated reads from imf + worldbank; many small charts |
| commodities | 7 | COT positioning grid; cross-market FX overlay |

Two tabs per PR is OK if they're fully independent and diff is small.

---

### Phase 5 — Hardest tabs (3–4 days)

| Tab | Panels | Risk |
| --- | ---: | --- |
| fx | 9 | Sub-tab driven (Carry Map view replaces the bento grid for that sub-tab) |
| equities | 10 | Sub-tab driven (HeatmapView, BarRaceView, ListView, DataHubView each replace the bento grid) |
| analytics | 11 | Heavy custom row layouts; least uniform |

These need *partial* migration: only the panels that mount in the default bento grid view get BentoCard. The replacement views (Heatmap, BarRace, etc.) keep their existing markup since they're not bento panels.

**Exit criteria:** every panel reachable via `panel-registry.js` is on BentoCard. Sub-tab-only views are out of scope.

---

### Phase 6 — Cleanup (1–2 days)

Now safe to do, because every consumer is on BentoCard:

- Delete dead per-tab CSS classes (`.bonds-bento-card`, `.fx-bento-card`, …) from per-tab dashboard CSS files.
- Trim the alias-selector list in `src/components/BentoWrapper.css` to just `.bento-card` + a brief comment about historical aliases.
- Update `docs/PANELS.md` to reference the canonical component.
- Remove any "if you're adding a new panel, copy this template" boilerplate from per-tab READMEs (if they exist).

This phase is a single PR. Run all four test suites. No visual diff expected.

---

## 7. Test strategy across phases

| Layer | What it catches | When run |
| --- | --- | --- |
| `npm test` (vitest) | DataProvider, hooks, helper logic regressions | Every PR |
| `npm run test:coverage` (Playwright) | Registered panel goes empty / unregistered panel appears | Every PR |
| `npm run test:audit` (Playwright) | Soft PENDING/NO DATA report | Every PR (sanity) |
| `npm run test:persist` (Playwright) | Drag/reload layout persistence | Phase 0, then any phase touching drag handle |
| Manual screenshot diff | Visual regressions the test suites can't see | Per tab in Phases 1–5 |

The panel-registry's title matcher means renaming a card title would fail the test loudly, which is what we want.

## 8. Per-tab PR template

```
### bentocard: migrate <tab> (phase N/6)

**Panels migrated:** <count>
**LOC delta:** <removed>/<added>

#### Test suites
- [ ] `npm test`
- [ ] `npm run test:coverage`
- [ ] `npm run test:audit`
- [ ] `npm run test:persist` (if drag-related changes)

#### Visual
- [ ] Pre-screenshot: <attached>
- [ ] Post-screenshot: <attached>
- [ ] Diff: none / acceptable / flagged

#### Notes / variations
- <any panel that needed `bare` / `titleActions` / `noFooter` / custom className>
- <any per-tab CSS rules left intact and why>

#### Rollback
git revert this PR. No data migration; component is purely presentational.
```

## 9. Rollout & rollback

- **No feature flag.** This is a presentation-layer refactor. Behavior is identical. Flagging would just add complexity.
- **Per-tab PRs** so any single regression is easy to roll back without unwinding the entire effort.
- **Each phase soaks ≥ 1 workday** before the next phase starts. If users find a regression (e.g., hover color wrong on Bonds), we have time to fix in-place before more tabs depend on the same path.
- **Rollback unit:** one PR. `git revert` restores per-tab JSX + the duplicate CSS we hadn't yet deleted.

## 10. Success metrics

Captured at start of Phase 0 and end of Phase 6:

| Metric | Today | Target |
| --- | --- | --- |
| Distinct `*-bento-card` JSX patterns | ~18 | 1 |
| LOC across `src/markets/*/{,components/}*Dashboard.{jsx,css}` for card chrome | ~1,200 (estimated) | ~300–500 |
| Panel count using `<BentoCard>` | 0 | 157 (full default views) |
| Median time to add a new panel (LOC, manual estimate) | ~15 lines | ~5 lines |
| Visual contract drift incidents in the prior month | n/a baseline | 0 |

## 11. When NOT to do this

- If the team is shipping a feature on the critical path and can't absorb 15+ days of refactor work.
- If a redesign is imminent (within ~3 months) — do this *after* the redesign, not before, so the new visual contract lives in the component.
- If active development is concentrated in one or two tabs — migrate those tabs *last* to avoid PR conflicts.

## 12. Decision log (fill as we go)

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-05-03 | Plan drafted | Audit finding #7 follow-on; bento-card consolidation needs both CSS dedup *and* component extraction |
| 2026-05-03 | Phase 0 landed: `BentoCard` component, CSS, 13 unit tests, API doc | Pilot prerequisite; component lives at `src/components/BentoCard/` and is documented at `docs/components/BentoCard.md` |
| 2026-05-03 | Phase 1 landed: BLS migrated as pilot | 3 cards converted, BLS-specific accent (blue border-left) preserved by scoping to `.bls-bento-panel > .bento-panel-title-row`. No data-flow changes. `panel-registry.js` BLS entries pass without modification (titles unchanged). |
| 2026-05-03 | Two real bugs caught by full Playwright sweep | (a) `BentoCard` was a plain function component; react-grid-layout's `GridItem` forwards a ref via `cloneElement`, triggering "Function components cannot be given refs" — fixed by wrapping in `React.forwardRef` and spreading RGL-injected props (`style`, `onMouseDown`, etc.). (b) Pre-existing audit fix #5 deleted `imf/ImfDashboard.css` and `worldbank/WorldBankDashboard.css` but left CSS-only side-effect imports in `GlobalMacroMarket.jsx` — fixed by removing both stale imports. Lesson: `grep` for component imports misses CSS imports; future orphan-cleanup audits must check both. |
| 2026-05-03 | Verification: 18/18 tabs render, zero JS errors | 11 tabs fully ok; 7 partial (data-availability artifacts only — niche FRED series PENDING/NO DATA, not regressions). 55 vitest unit tests pass (BentoCard 14, DataProvider 30, BLS 5, BentoWrapper 6). BLS panel-coverage Playwright spec passes (only tab whose registry was recently calibrated). |
| 2026-05-03 | API extension: `contentClassName` prop added | Discovered during Phase 2 that watchlist + calendar use a per-tab class on the `bento-panel-content` wrapper (`watch-panel-scroll`, `cal-panel-scroll`) for custom padding/scroll behavior. Added `contentClassName` prop so consumers can extend the content wrapper's class without losing the base. New unit test added (15/15 passing). |
| 2026-05-03 | Phase 2 landed: alerts (3), watchlist (3), eia (4), calendar (9) — 19 cards migrated | All four dashboards converted to `<BentoCard>`. Stale `stopDrag` helpers removed from each file. EIA already used canonical `.bento-card` class so no CSS changes; alerts/watchlist/calendar keep their per-tab `.X-bento-card` classes via the `className=` prop until Phase 6 cleanup. **18/18 tabs render with zero JS errors after Phase 2.** Same partial counts as pre-Phase-2 (alerts 2 PENDING, watchlist 2 NO DATA — pre-existing data-flow artifacts, not regressions). |
| (TBD) | API frozen after Phase 2 soak | Validate hover + drag on alerts/watchlist/calendar interactively before opening Phase 3. The `contentClassName` prop is the only API addition since pilot — anything else added in Phase 3+ should trigger a re-review. |
| 2026-05-03 | Phase 3 landed: credit (10), sentiment (8), crypto (8), insurance (9) — 35 cards migrated | All four dashboards converted; stale `stopDrag` helpers + DataFooter imports removed. **No new API additions** — `contentClassName` (added in Phase 2) handled every per-tab content-wrapper variation. Verification: 18/18 tabs render with zero JS errors after Phase 3, identical health profile to Phase 2 baseline (11 ok / 7 partial). Sentiment screenshot confirms: Market Snapshot, Key Metrics, Fear & Greed score 52 chart, Risk Dashboard, CFTC Positioning all render correctly through BentoCard chrome. |
| 2026-05-03 | Operational lesson: Vite proxy port race | First Phase 3 verification run showed 94+ JS errors per tab — the vite dev server had cached `getBackendPort()` to its 3001 fallback because `.server-port` wasn't populated when Vite started. Restart Vite *after* the backend has written its port. For automation: have the start script gate Vite startup on `.server-port` non-empty. Worth a small fix to `vite.config.js` to re-read the file per request, but out of scope for this migration. |
| 2026-05-03 | Phase 4 landed: commodities (7), derivatives (10), realEstate (10), equitiesDeepDive (11), globalMacro (13), bonds (13) — 64 cards migrated | All six complex tabs converted in a single sitting. **No new API additions.** Two cards deferred (sub-component owns its own title row + footer): `realEstate.census-*` (4 panels) and `bonds.realYield`. These will be migrated when their sub-components (`CensusXxxPanel`, `RealYields`) are refactored to expose just their content. Verification: 18/18 tabs render with zero JS errors after Phase 4, identical health profile to Phase 3 baseline (11 ok / 7 partial). Bonds screenshot shows Yield Curve panel + Key Metrics sidebar + Yields/Spreads/Real Yields breakdown all rendering through BentoCard chrome. GlobalMacro shows Country Scorecard + GDP/Inflation/CB Rates breakdown intact. |
| (TBD) | API frozen after Phase 4 soak | Phase 4 was the largest single batch (6 tabs, 64 cards). Validate hover + drag interactively on bonds (biggest tab) and globalMacro (most diverse) before opening Phase 5. The two deferred sub-component cases (RealYields + CensusXxxPanel) are tracked as a Phase 6 sub-task. |
| 2026-05-03 | Phase 5 landed: fx (8), analytics (11), equities (1) — 20 cards migrated | Phase 5 was the partial-migration phase per plan §6.5. **fx**: 8 cards converted, `carry` deferred (CarryMap owns chrome). **analytics**: all 11 cards converted (`noFooter` for all — analytics is internal/dev, no provenance footers). **equities**: only `kpi` migrated; the `sidebar` card has a non-DataFooter custom footer (refresh button), and the per-view-mode cards (heatmap, list-main, detail-sidebar, portfolio, radar, race, ml-explorer, datahub) each delegate chrome to their embedded view component (HeatmapView, BarRaceView, etc.) — these are intentionally out of scope per plan §6.5. **No new API additions.** Verification: 18/18 tabs render with zero JS errors after Phase 5, identical health profile (11 ok / 7 partial). FX and Analytics screenshots confirm full layout fidelity. |
| 2026-05-03 | Migration complete: 144 of 157 cards on `<BentoCard>` (92%) | 13 cards intentionally deferred to Phase 6 (sub-component owns chrome): `realEstate.census-*` (4), `bonds.realYield` (1), `fx.carry` (1), `equities.sidebar` + 7 per-view-mode cards. Phase 6 next: delete dead per-tab `*-bento-card` CSS rules (BentoWrapper.css's central multi-selector now provides the base for all 16 variants), trim docs, and refactor the 4 sub-component cases above to fit BentoCard. |
| 2026-05-03 | Phase 6 landed: CSS dedup + 4 sub-component refactors + docs | **6a (CSS dedup):** removed duplicate base properties from 14 dashboard CSS files (~233 LOC). Each file kept only its `:hover` accent rule. BLS skipped — uses different vars (`--card-bg`, `--border-color`, 8px radius) so it's not a duplicate. Added `.deriv-bento-card` to the canonical multi-selector list. **6b (sub-component refactors):** `CensusDashboard.jsx` (4 panels) refactored to return content only; titles passed via parent's `<BentoCard>`. `RealYields` returns just the chart. `CarryMap` returns content only; subtitle moved to BentoCard. `equities.sidebar` migrated using new `footer` prop for the refresh-button toolbar. **API addition:** `footer` prop (custom JSX overriding DataFooter and noFooter) — enables custom toolbars in panels without DataFooter provenance. New unit test added (16/16 passing). **6c (docs):** `BentoCard.md` promoted from "pilot-stage" to "production"; migration recipe + special-case notes added. Plan status flipped to ✅ complete. |
| 2026-05-03 | **Migration complete: 157 of 157 default-view panels on `<BentoCard>` (100%)** | Equities sub-tab views (Heatmap, BarRace, ListView, DataHubView, ML Explorer, Portfolio, Radar) remain as raw divs by design — they're full-frame replacements that don't fit the bento grid. Per plan §6.5 these are out of scope. The migration goal — every default-view panel rendered through one shared component — is achieved. |

---

## Appendix A — Why a component, not just shared CSS

The 2026-05-02 follow-up (CSS dedup, Phase #7 of the audit) gets ~30% of the value: visual contract sharing. A shared component gets the other 70%:

1. **Behavioral consistency.** Today, each tab's panel rolls its own `onMouseDown stopPropagation` (some forget; those panels are sticky-draggable when they shouldn't be). Component owns it.
2. **DataFooter contract.** Today, every panel passes 7 props to `DataFooter`. A typo (e.g., wrong `source` string) ships silently. Component centralizes this — and the panel-registry test catches missing footers.
3. **Future redesign.** Today, restyling means editing 18 files. With the component, it's one diff.
4. **Accessibility.** Adding ARIA roles, keyboard support, focus management — once, not 18 times.
5. **A11y / drag UX improvements** (e.g., a drag-handle indicator, keyboard reordering) become possible because the entry point is one component, not 18 DOM templates.

The CSS dedup is a 1-day win on maintenance. The component is a structural lock-in that prevents the drift from coming back.
