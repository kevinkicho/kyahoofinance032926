# Agent instructions (kyahoofinance032926)

This file is binding for any AI agent working in this repository.

## Mandatory quality gates (do not skip)

Before **every** `git commit` that changes product code, workflows, or config:

1. Run `npm run guard:secrets`
2. If you touched `.github/workflows/**`, run `npm run lint:workflows`
3. Run `npm test` (Vitest). Fix failures; do not commit broken tests.

Before **every** `git push` to GitHub:

1. Run `npm run preflight` (secrets + workflow lint + vitest)
2. For deploy-related or large changes: `npm run preflight:full` (adds `npm run build` + functions build)

Git hooks enforce this when installed (`npm run hooks:install` / `npm prepare`):

- **pre-commit** → secrets + workflow lint  
- **pre-push** → full `npm run preflight`

If a hook is missing, **still run preflight manually**. Never use `--no-verify` unless the user explicitly orders it and understands the risk.

## What unit tests do *not* catch

Recent “CI failed on GitHub” issues were often **GitHub Actions workflow policy**, not app code:

| Failure class | Caught by unit tests? | Caught by |
|---|---|---|
| Bad React null access | sometimes | vitest + e2e |
| Bad Express route | often | vitest server tests |
| `if: secrets.X != ''` in workflow YAML | **never** | `npm run lint:workflows` / real GHA |
| Missing GitHub secret / env protection | **never** | live Actions run |
| App Hosting cold start / hollow cache | **never** | postdeploy warm + hosted probe |

So “tests passed locally” is necessary but not sufficient for workflow/deploy changes. Always run `lint:workflows` when editing `.github/`.

## Forbidden shortcuts

- Do not push workflow YAML with secret emptiness checks (`secrets.FOO != ''`). Use `vars.FEATURE_FLAG == 'true'`.
- Do not commit real API keys, PEM private keys, or service-account JSON (see `guard:secrets`).
- Do not archive a broken workflow as “fixed” without running preflight.

## Preferred verification order

```text
npm run preflight          # default before push
npm run preflight:full     # before claiming deploy-ready
npm run postdeploy:warm    # after App Hosting ships (HTTP warm)
```

## Canonical deploy path

- **Production**: Firebase App Hosting (Cloud Run).
- Warm APIs: `scripts/post-deploy-warm.mjs` / workflow `postdeploy-warm.yml`.
- Shared cache: `MARKET_CACHE_BUCKET` + `docs/SHARED_CACHE.md`.

## Docs

Start at [`docs/README.md`](docs/README.md). Conventions: [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md).
Deploy: [`docs/DEPLOY.md`](docs/DEPLOY.md). Pipeline: [`docs/DATA_PIPELINE.md`](docs/DATA_PIPELINE.md).
CI: [`docs/CI_PREFLIGHT_GUIDE.md`](docs/CI_PREFLIGHT_GUIDE.md).
