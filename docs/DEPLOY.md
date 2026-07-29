# Deploy — Global Market Hub

## Canonical production: Firebase App Hosting

| Item | Value |
|------|--------|
| URL | https://kyahoofinance032926--kfinance032926.us-central1.hosted.app |
| Runtime | Cloud Run (Node) — `runCommand: node server/index.js` |
| Config | [`apphosting.yaml`](../apphosting.yaml) |
| API | Same origin `/api/*` (no `VITE_API_BASE_URL` required) |
| Shared cache | GCS `MARKET_CACHE_BUCKET=kfinance032926-market-cache` |

Push to `master` triggers App Hosting build + rollout.

### Before every push (local gate)

```bash
npm run preflight          # secrets + workflow lint + vitest (also runs on git pre-push)
npm run preflight:full     # + vite build + functions build (deploy-heavy changes)
```

Hooks live in `.githooks/` (`npm run hooks:install`). Agents must follow [`AGENTS.md`](../AGENTS.md).  
Workflow YAML policy (e.g. never `if: secrets.X != ''`) is enforced by `npm run lint:workflows` — see [`CI_PREFLIGHT_GUIDE.md`](./CI_PREFLIGHT_GUIDE.md).

After a new revision is healthy:

```bash
npm run postdeploy:warm
# or GitHub Actions → "Post-deploy warm (App Hosting)" (default: warm-only HTTP)
```

This warms priority market APIs (seeds local disk + GCS). Optional traffic routing requires repo variable `ENABLE_GCLOUD_TRAFFIC=true` and secret `GCP_SA_KEY`.

### Scheduled warm (enabled)

Cloud Scheduler job **`market-cache-warm`** (us-central1):

| Field | Value |
|-------|--------|
| Schedule | `0 */6 * * *` (America/New_York) |
| Target | `POST …/api/warm` |
| Body | priority market paths (bonds, realEstate, insurance, …) |

```bash
gcloud scheduler jobs describe market-cache-warm --location=us-central1 --project=kfinance032926
gcloud scheduler jobs run market-cache-warm --location=us-central1 --project=kfinance032926
```

If `WARM_TOKEN` is set on the service, update the job headers with `x-warm-token`.

---

## Legacy (not production)

### GitHub Pages + Cloud Functions

Archived / non-production:

- Workflow moved to `.github/workflows/archive/deploy-pages.yml.legacy` (not active)
- Requires `VITE_API_BASE_URL` if revived
- **Not** the canonical product path

### Firebase Functions (`functions/`)

Used historically for:

- Scheduled RTDB market snapshots
- Admin refresh

Live UI loads use **App Hosting Express** + **GCS/disk cache**, with `USE_RTDB_SEED = false`.  
RTDB can remain for historical date-picker / analytics only.

```bash
# Only if you still need snapshot writers
firebase deploy --only functions
```

### Local Docker

```bash
docker-compose up --build   # http://localhost:3001
```

---

## Secrets (App Hosting)

Configured in Firebase console / `apphosting.yaml` as secrets:

- `FRED_API_KEY`, `EIA_API_KEY`, `BLS_API_KEY`, `BEA_API_KEY`, …
- Firebase web config (`VITE_FIREBASE_*`)
- `MARKET_CACHE_BUCKET` (plain env, not secret)

See [`SHARED_CACHE.md`](./SHARED_CACHE.md) for GCS setup.
