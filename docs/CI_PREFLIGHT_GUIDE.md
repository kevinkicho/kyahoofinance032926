# CI Preflight & Quality Gate Guide

Local quality gate for humans and AI agents. Binding policy: root
**`AGENTS.md`** — see it for the enforced gates table, the preflight /
preflight:full step breakdown, and the forbidden shortcuts. This doc
covers what those gates do **not** catch and the extra suites.

Install hooks once per clone (`npm run hooks:install` — also runs via
`npm install` / `npm prepare`); do **not** use `git push --no-verify`
unless you deliberately accept risk.

---

## What local gates do not catch

| Failure class | Mitigation |
|---|---|
| Missing GitHub secret / wrong env | Real Actions run; document secrets |
| Repo environment protection | GitHub Settings → Environments |
| Hosted cold start / hollow cache | `npm run postdeploy:warm`, scheduler, GCS |
| Live third-party API outages | Disk/GCS cache + hollow guards |

Vitest does not parse workflow YAML — always run `lint:workflows` when
editing `.github/`.

---

## GitHub Actions

| Workflow | When | What |
|---|---|---|
| `.github/workflows/ci.yml` | PR + push to master | `npm ci` + `npm run preflight` |
| `.github/workflows/postdeploy-warm.yml` | manual / ops | HTTP warm (+ optional traffic) |

Do not use `if: secrets.X != ''` in workflows — `lint:workflows` blocks that.

## Extra suites (not in default preflight)

| Layer | Command |
|---|---|
| Playwright E2E | `npm run test:e2e` |
| Data-binding audit | `npm run test:audit` |
| Panel coverage | `npm run test:coverage` |
| Offline validate / regress | `npm run test:validate` / `npm run test:regress` |
| Functions proxy check | `node scripts/check-functions-proxy.mjs` (also in preflight) |

Deploy path: [`DEPLOY.md`](./DEPLOY.md).
