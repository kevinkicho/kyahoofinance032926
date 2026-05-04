# Follow-up: per-tab bento-card CSS deduplication

> **Status: ✅ COMPLETED 2026-05-03** as Phase 6a of the BentoCard migration.
> Removed ~233 LOC of duplicate base properties across 14 dashboard CSS files.
> The cron job (8b22a430) was cancelled. This file is kept as historical
> context. See `docs/plans/bentocard-migration.md` for the full record.

---

**Scheduled origin:** 2026-05-02 audit, finding #7 (scoped fix landed; per-tab cleanup deferred)
**Target trigger date:** on or after **2026-05-18** (≥ 2 weeks of soak after the critical fixes)
**Estimated agent runtime:** 30–60 min, single sitting
**Risk:** low if all four test suites pass; visual smoke is the safety net

## Why this is a follow-up, not an immediate fix

Audit finding #7 ("18 dashboards each redefine `*-bento-card` chrome — ~12.7K LOC of CSS") was the biggest maintenance win, but doing it in the same PR as the three critical runtime bug fixes (auditFreshness bitshift, deep-clone storm, dead currency conversion) would have made any visual regression hard to attribute. Soak-time first. Cleanup second.

## How to fire this off on or after 2026-05-18

### Option A — paste the prompt below into a fresh Claude Code session

```
[Open Claude Code in this repo, then paste everything between the BEGIN/END markers below as your first message.]
```

### Option B — pipe the prompt section in

```bash
sed -n '/^<!-- BEGIN AGENT PROMPT -->/,/^<!-- END AGENT PROMPT -->/p' \
  docs/follow-ups/2026-05-18-bento-cleanup.md \
  | sed '1d;$d' \
  | claude
```

### Option C — the in-session cron

Job ID `8b22a430` was scheduled for `08:57 local on 2026-05-18` in the original session. If that Claude session is still alive on May 18, it will fire automatically. If you've restarted Claude since 2026-05-02, the cron is gone and you should use Option A or B above.

## What the agent will do

1. Verify the 14 critical audit fixes have soaked cleanly: `npm test`, `npm run test:coverage`, `npm run test:audit`. **If anything fails, stop — do not touch CSS.**
2. Walk 14 dashboard CSS files. Remove duplicate base properties from each `.X-bento-card` / `.X-bento-panel` block. The base is in `src/components/BentoWrapper.css` and covers: background, border-radius, border, display, flex-direction, overflow, transition, box-shadow, height, container-type, container-name, cursor.
3. Keep tab-specific accent rules (typically `:hover { border-color }` + custom shadow), keep any property that DIFFERS from the base.
4. Re-run all four test suites + visual smoke via Playwright screenshots.
5. Open a PR titled `css: deduplicate per-tab bento-card base rules (audit follow-up #7)`.
6. **Stop at the PR. Do not push to main. Tag for human review.**

## Files in scope

- `src/markets/alerts/components/AlertsDashboard.css`
- `src/markets/analytics/AnalyticsDashboard.css`
- `src/markets/bls/BlsMarket.css`
- `src/markets/bonds/components/BondsDashboard.css`
- `src/markets/calendar/CalendarMarket.css`
- `src/markets/credit/components/CreditDashboard.css`
- `src/markets/crypto/components/CryptoDashboard.css`
- `src/markets/equities/EquitiesDashboard.css`
- `src/markets/equitiesDeepDive/components/EquitiesDeepDiveDashboard.css`
- `src/markets/fx/components/FXDashboard.css`
- `src/markets/globalMacro/components/GlobalMacroDashboard.css`
- `src/markets/insurance/components/InsuranceDashboard.css`
- `src/markets/realEstate/components/RealEstateDashboard.css`
- `src/markets/sentiment/components/SentimentDashboard.css`

## Acceptance criteria for the PR

- LOC reduction across the 14 files (expected: 100–250 lines).
- All four test suites pass: `test`, `test:coverage`, `test:audit`, `test:persist`.
- Playwright screenshots before/after for at least Bonds and FX (high-density tabs) show no visual diff in card chrome.
- PR description lists any files where the duplicate was deliberately KEPT because the per-tab values differed from the base — this is fine, it's data not regression.

---

<!-- BEGIN AGENT PROMPT -->
You are picking up an audit follow-up from 2026-05-02. Read this file end-to-end before doing anything: docs/follow-ups/2026-05-18-bento-cleanup.md.

Context summary you must internalize:
- A 14-finding audit was done on 2026-05-02. Finding #7 was the per-tab bento-card CSS consolidation. The SCOPED fix landed (BentoWrapper.css now has a unified base + 18 alias selectors). The DEDUPE pass — removing copy-pasted base rules from per-tab CSS — was deferred for soak.
- Today is on or after 2026-05-18. Soak time is up. Your job is the dedupe pass.

Procedure (follow exactly):

1. Verify soak. Run in this order, stop at first failure:
   - `npm test`
   - `npm run test:coverage`
   - `npm run test:audit`
   If any fail, do NOT touch CSS. Open a report listing what regressed since 2026-05-02 and quit.

2. Read `src/components/BentoWrapper.css` lines 50–80 to confirm the canonical base. Note every property the multi-selector sets.

3. For each file in the list at the top of docs/follow-ups/2026-05-18-bento-cleanup.md, find the `.X-bento-card { ... }` or `.X-bento-panel { ... }` rule. Diff it against the canonical base. Remove ONLY lines that are exact duplicates of the base. Keep:
   - `:hover` accents (`border-color`, custom box-shadow)
   - Any property whose VALUE differs from the base
   - Comments
   - Resize-handle, drag-cancel, and other behavioral overrides

4. After all 14 files are edited, re-run all four suites: `npm test`, `npm run test:coverage`, `npm run test:audit`, `npm run test:persist`. All must pass. If any fail, identify which file caused it (likely a property you removed was actually overriding the base) and revert just that change.

5. Visual smoke: `npm start` and use Playwright to navigate to Bonds, FX, Crypto tabs. Save screenshots. Compare against test-results/baseline if it exists; otherwise just verify cards render with chrome (border, radius, hover).

6. Open a PR via `gh pr create`:
   - Title: `css: deduplicate per-tab bento-card base rules (audit follow-up #7)`
   - Body must include:
     a. LOC removed per file (table)
     b. Files where the duplicate was kept and why
     c. Confirmation of all four test suites passing (paste the summary lines)
     d. Two before/after screenshots embedded
   - Do NOT push to main. Do NOT merge. Tag the PR for human review.

7. Final summary back to the user: under 400 words, what changed, what passed, what to review.

Hard constraints:
- Touch ONLY the 14 listed CSS files. No JSX changes. No BentoWrapper.css changes (that's already done).
- If a file's `.X-bento-card` block has ANY non-base property mixed in, leave the whole block. Don't try to be surgical — keep the file unchanged and flag it in the PR description.
- If you are uncertain whether something is a base duplicate or a deliberate override, leave it. False negatives (kept duplicate) cost zero. False positives (removed real override) cost a visual regression.
<!-- END AGENT PROMPT -->
