# CI Preflight & Quality Gate Guide

This guide establishes the mandatory pre-flight checks and quality gates required to ensure that all local changes compile, run, and pass automated tests before pushing commits to GitHub.

---

## 1. Requirement checklist

Before performing `git push`, the codebase **must** satisfy the following 5 requirements:

| Check | Command | Context / Description |
|---|---|---|
| **1. Secret Guard** | `npm run guard:secrets` | Scans tracked files for leaked API keys or Firebase secrets. |
| **2. Frontend Compilation** | `npm run build` | Compiles the production assets in `dist/` using Vite. |
| **3. Unit Tests & Coverage** | `npm test` | Runs the Vitest suite; must maintain **>= 40% coverage** on all metrics. |
| **4. Cloud Functions Build** | `cd functions; npm run build` | Compiles TypeScript functions to `lib/index.js` for Firebase deployment. |
| **5. E2E & Layout Audits** | `npm run test:audit` | Runs Playwright tests to verify data binding across all tabs. |

---

## 2. CI Verification & Test Suites

The codebase includes three main testing layers that verify correctness:

### A. Vitest Unit Test Layer
Tests state transitions, data providers, route factory logic, and backend helpers.
- Run tests: `npm test`
- Run coverage verification: `npx vitest run --coverage`

### B. Playwright E2E & Audit Layer
Fires up a headless browser to audit runtime layout and state binding on the dashboards.
- **Whole Suite**: `npx playwright test`
- **Data Binding Audit**: `npm run test:audit` (checks all 21 markets for proper data binding)
- **Panel Status Coverage**: `npm run test:coverage` (audits panels status indicators and loads)
- **Settings Persistence**: `npm run test:persist` (ensures theme and currency choices persist)

### C. Offline Validation Layer
Spins up a local browser, visits all dashboard tabs, takes full-page screenshots, and compiles a structural report.
- Run validation: `npm run test:validate` (Generates screenshot output in `test-results/validate/` and markdown report in `test-results/validate.md`)
- Run regression comparison: `npm run test:regress`

---

## 3. Pre-push Verification Procedure

To run the preflight checklist locally in a single command, execute the following PowerShell command in the project root:

```powershell
# Run static validation, build checks, and unit tests
npm run guard:secrets && npm run build && cd functions && npm install --ignore-scripts && npm run build && cd .. && npm test
```

If any step in the chain fails, **resolve the failure before pushing to the repository**.
