# Shared market cache (GCS)

Cloud Run disk is **per instance**. Without a shared layer, a new revision or
second replica rebuilds FRED-heavy markets from scratch (bonds can take 60–120s).

## How it works

1. **Local disk** (`server/datacache/{market}-YYYY-MM-DD.json`) — always used.
2. **GCS mirror** (optional) — same JSON under  
   `gs://$MARKET_CACHE_BUCKET/market-cache/{market}-{date}.json`  
   and `…/{market}-latest.json`.

On read (async path used by `routeFactory`):

1. Try local daily file (hollow reject + prior-day hydrate).
2. If miss → download from GCS → seed local → serve.

On write: local write, then fire-and-forget GCS upload.

## Setup (one-time)

```bash
# Bucket (regional, near App Hosting)
gcloud storage buckets create gs://kfinance032926-market-cache \
  --project=kfinance032926 \
  --location=us-central1 \
  --uniform-bucket-level-access

# Runtime service account for App Hosting / Cloud Run
# (replace with the SA shown on your Cloud Run service)
SA="service-989678779159@gcp-sa-firebaseapphosting.iam.gserviceaccount.com"

gcloud storage buckets add-iam-policy-binding gs://kfinance032926-market-cache \
  --member="serviceAccount:${SA}" \
  --role="roles/storage.objectAdmin"
```

Set the env in `apphosting.yaml`:

```yaml
  - variable: MARKET_CACHE_BUCKET
    value: kfinance032926-market-cache
    availability:
      - RUNTIME
```

Redeploy, then:

```bash
npm run postdeploy:warm
```

## Auth

| Environment | Token source |
|-------------|--------------|
| Cloud Run / App Hosting | Metadata server (ADC) |
| Local with service account | `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` |
| Local without credentials | GCS disabled; disk-only |

## Ops

- Hollow / shrink guards still apply before any write (local or GCS).
- Disable by clearing `MARKET_CACHE_BUCKET`.
- Inspect: `gcloud storage ls gs://BUCKET/market-cache/`
