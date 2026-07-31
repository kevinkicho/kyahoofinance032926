# CI Preflight & Quality Gate Guide

Local quality gate for humans and AI agents. Binding policy: root **`AGENTS.md`**.

---

## Enforced gates

| When | What runs | How |
|---|---|---|
| **pre-commit** | Secret scan + workflow lint | `.githooks/pre-commit` |
| **pre-push** | Full preflight | `.githooks/pre-push` |
| **Manual / agents** | Same as pre-push | `npm run preflight` |
| **Deploy-heavy changes** | Preflight + builds | `npm run preflight:full` |

### Install hooks (once per clone)

```bash
npm run hooks:install
# also runs on npm install via "prepare"
```

Sets `git config core.hooksPath .githooks`.

Do **not** use `git push --no-verify` unless you deliberately accept risk.

---

## What preflight runs

### `npm run preflight`

1. **Secret Guard** — `npm run guard:secrets`
2. **Workflow lint** — `npm run lint:workflows`  
   (blocks patterns GitHub rejects, e.g. `if: secrets.FOO != ''`)
3. **Unit tests** — `npm test` (Vitest)

### `npm run preflight:full`

Above, plus:

4. **Frontend build** — `npm run build`
5. **Functions build** — `cd functions && npm run build`

---

## What local gates do not catch

| Failure class | Mitigation |
|---|---|
| Missing GitHub secret / wrong env | Real Actions run; document secrets |
| Repo environment protection | GitHub Settings → Environments |
| Hosted cold start / hollow cache | `npm run postdeploy:warm`, scheduler, GCS |
| Live third-party API outages | Disk/GCS cache + hollow guards |

Vitest does not parse workflow YAML — always run `lint:workflows` when editing
`.github/`.

---

## Extra suites (not in default preflight)

| Layer | Command |
|---|---|
| Playwright E2E | `npm run test:e2e` |
| Data-binding audit | `npm run test:audit` |
| Panel coverage | `npm run test:coverage` |
| Offline validate / regress | `npm run test:validate` / `npm run test:regress` |

Deploy path: [`DEPLOY.md`](./DEPLOY.md).
