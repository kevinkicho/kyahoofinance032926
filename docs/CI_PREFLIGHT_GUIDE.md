# CI Preflight & Quality Gate Guide

This guide is the **enforced** local quality gate for humans and AI agents.  
It exists because documentation alone was not enough: agents kept pushing changes that failed on GitHub.

---

## Why “precommit” did not stop past failures

| Expectation | Reality (before this enforcement) |
|---|---|
| Pre-commit hooks block bad commits | Only Git’s **`.sample`** hooks existed — **nothing ran** on commit/push |
| `docs/CI_PREFLIGHT_GUIDE.md` is mandatory | It was a manual checklist; agents could ignore it |
| `npm test` green means CI green | **False** for GitHub Actions YAML policy bugs (e.g. `if: secrets.X != ''`) |
| “CI” = unit tests | Many red runs were **workflow validation** or deploy/env, not Vitest |

Unit tests never parse `.github/workflows/*.yml`. A workflow that GitHub rejects still “passes” Vitest.

---

## Enforced local gates (now)

| When | What runs | Command |
|---|---|---|
| **pre-commit** (git hook) | Secret scan + workflow lint | automatic via `.githooks/pre-commit` |
| **pre-push** (git hook) | Full preflight | automatic via `.githooks/pre-push` |
| **Manual / agents** | Same as pre-push | `npm run preflight` |
| **Deploy-heavy changes** | Preflight + builds | `npm run preflight:full` |

### Install hooks (once per clone)

```bash
npm run hooks:install
# also runs automatically on npm install via the "prepare" script
```

This sets `git config core.hooksPath .githooks`.

**Do not use `git push --no-verify`** unless you deliberately accept shipping untested work.

---

## Preflight contents

### Default — `npm run preflight`

1. **Secret Guard** — `npm run guard:secrets`  
2. **Workflow lint** — `npm run lint:workflows`  
   - Blocks `if: secrets.FOO != ''` and similar GitHub-rejected patterns  
3. **Unit tests** — `npm test` (Vitest)

### Full — `npm run preflight:full`

Everything above, plus:

4. **Frontend build** — `npm run build`  
5. **Cloud Functions build** — `cd functions && npm run build` (if present)

### One-liner (PowerShell / bash)

```bash
npm run preflight
# or
npm run preflight:full
```

If any step fails, **fix before push**.

---

## What still cannot be caught locally

| Failure class | Why local gates miss it | Mitigation |
|---|---|---|
| Missing GitHub secret / wrong env | Needs live Actions | Document required secrets; keep warm path secret-free by default |
| Repo environment protection rules | GitHub settings | Settings → Environments |
| Hosted cold start / hollow cache | Needs live App Hosting | `npm run postdeploy:warm`, scheduler, GCS cache |
| Live third-party API outages | Network | Cache + hollow guards |

---

## Extra suites (not in default preflight)

Use when changing panels, layout, or data binding:

| Layer | Command |
|---|---|
| Playwright E2E | `npm run test:e2e` |
| Data-binding audit | `npm run test:audit` |
| Panel coverage | `npm run test:coverage` |
| Offline validate / regress | `npm run test:validate` / `npm run test:regress` |

Default preflight stays fast enough that agents actually run it on every push.

---

## Agent policy

See root **`AGENTS.md`**: agents must run preflight before push and must not skip hooks.

---

## Troubleshooting older “Pages deploy” failures

If a **Build** job succeeds but a **Deploy** job fails with environment protection on `github-pages`, that is repository settings — and **Pages is no longer the canonical host** (App Hosting is). Prefer the App Hosting + `postdeploy-warm` path described in `docs/DEPLOY.md`.
