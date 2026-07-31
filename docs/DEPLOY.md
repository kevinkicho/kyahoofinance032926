# Deploy — Global Market Hub

Doc map: [`README.md`](./README.md).

## Production: Firebase App Hosting

| Item | Value |
|------|--------|
| URL | https://kyahoofinance032926--kfinance032926.us-central1.hosted.app |
| Runtime | Cloud Run — `runCommand: node server/index.js` |
| Config | [`apphosting.yaml`](../apphosting.yaml) |
| API | Same origin `/api/*` |
| Shared cache | GCS `MARKET_CACHE_BUCKET=kfinance032926-market-cache` |

Push to `master` triggers App Hosting build + rollout.

### Nightly RTDB snapshots

Cloud Scheduler runs **daily 00:00 UTC** (`refreshMarketSnapshots`): fetches every
market from **App Hosting**, writes:

- `marketSnapshots/{id}/latest`
- `marketSnapshots/{id}/history/YYYY-MM-DD`

Code: `functions/src/index.ts` (`LIVE_API_BASE` defaults to the App Hosting URL).

```bash
cd functions && npm run build
firebase deploy --only functions:refreshMarketSnapshots
```

Verify after midnight UTC (or manual scheduler run): `marketSnapshots/_meta/lastRun`
should show `ok` equal to `total`. Job throws if any market fails after retries.

Optional keys (e.g. `USDA_NASS_API_KEY`) must exist on App Hosting or that market fails.

### Local quality gate

```bash
npm run preflight          # secrets + workflow lint + vitest
npm run preflight:full     # + vite build + functions build
```

Hooks: `.githooks/` (`npm run hooks:install`). Agents: [`AGENTS.md`](../AGENTS.md).  
Workflow policy: [`CI_PREFLIGHT_GUIDE.md`](./CI_PREFLIGHT_GUIDE.md).

### After a healthy revision

```bash
npm run postdeploy:warm
# or GitHub Actions → "Post-deploy warm (App Hosting)"
```

Warms priority `/api/*` (disk + GCS). Optional traffic routing needs
`ENABLE_GCLOUD_TRAFFIC=true` and secret `GCP_SA_KEY`.

### Scheduled warm

Cloud Scheduler **`market-cache-warm`** (us-central1): `0 */6 * * *` America/New_York,
`POST …/api/warm` with priority market paths.

```bash
gcloud scheduler jobs describe market-cache-warm --location=us-central1 --project=kfinance032926
gcloud scheduler jobs run market-cache-warm --location=us-central1 --project=kfinance032926
```

If `WARM_TOKEN` is set, include header `x-warm-token` on the job.

### Functions scope

`functions/` hosts the snapshot scheduler and related admin paths. Live UI data
loads use **App Hosting Express** + disk/GCS. RTDB is for historical dates /
nightly history, not the primary live paint.

```bash
firebase deploy --only functions   # when changing Functions code
```

### Local Docker (optional)

```bash
docker-compose up --build   # http://localhost:3001
```

## Secrets (App Hosting)

Firebase console / `apphosting.yaml`:

- `FRED_API_KEY`, `EIA_API_KEY`, `BLS_API_KEY`, `BEA_API_KEY`, …
- Firebase web config (`VITE_FIREBASE_*`)
- `MARKET_CACHE_BUCKET` (plain env)

See [`SHARED_CACHE.md`](./SHARED_CACHE.md).
