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

After a new revision is healthy:

```bash
npm run postdeploy:warm
```

This routes 100% traffic to the newest Ready revision and warms priority market APIs (seeds local disk + GCS).

### Scheduled warm (recommended)

Cloud Scheduler → HTTP POST to your hosted `/api/warm` every 6 hours (or daily before market open):

```bash
# Example (adjust URL / OIDC as needed for your project)
gcloud scheduler jobs create http market-cache-warm \
  --location=us-central1 \
  --schedule="0 */6 * * *" \
  --uri="https://kyahoofinance032926--kfinance032926.us-central1.hosted.app/api/warm" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"paths":["bonds","realEstate","insurance","credit","fx","globalMacro"]}' \
  --project=kfinance032926
```

If `WARM_TOKEN` is set on the service, add header `x-warm-token: <token>`.

---

## Legacy (not production)

### GitHub Pages + Cloud Functions

Still present for archival / optional static demos:

- Workflow: `.github/workflows/deploy-pages.yml`
- Requires `VITE_API_BASE_URL` pointing at Functions or App Hosting API
- **Not** the canonical product path — prefer App Hosting

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
