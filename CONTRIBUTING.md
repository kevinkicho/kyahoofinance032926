# Contributing to kyahoofinance032926

Thank you for your interest in contributing to this project.

## How to Contribute

1. **Fork / branch** — use a descriptive branch name (e.g. `feature/add-api-endpoint`).
2. **Install** — `npm install` (also wires git hooks via `prepare` → `.githooks/`).
3. **Develop** — follow existing style and naming.
4. **Quality gate before push** (required):

   ```bash
   npm run preflight          # secrets + workflow lint + vitest
   # for deploy / large changes:
   npm run preflight:full
   ```

5. **Commit** with a clear message. Pre-commit runs secret guard + workflow lint.
6. **Push** — pre-push runs full preflight. Do not use `--no-verify` unless you intentionally accept risk.
7. **Open a PR** (or push `master` if that is your workflow) and describe the change.

## Coding Standards

- Follow existing project style and naming conventions.
- Prefer tests for new behavior (`npm test` / Vitest).
- Never commit API keys, PEMs, or service-account JSON (`npm run guard:secrets`).
- Never use `if: secrets.NAME != ''` in GitHub Actions — use `vars.*` feature flags (`npm run lint:workflows`).

## Docs

| Doc | Purpose |
|-----|---------|
| [`docs/README.md`](docs/README.md) | **Index** — current docs |
| [`AGENTS.md`](AGENTS.md) | Rules for AI agents |
| [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) | Short current conventions |
| [`docs/CI_PREFLIGHT_GUIDE.md`](docs/CI_PREFLIGHT_GUIDE.md) | Preflight / hooks detail |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | App Hosting deploy + warm |
| [`docs/PANELS.md`](docs/PANELS.md) | Panel inventory |

## Feedback

Open an issue or contact the project maintainers.
