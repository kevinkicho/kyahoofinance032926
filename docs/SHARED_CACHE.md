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

## Setup (done for this project)

| Item | Value |
|------|--------|
| Bucket | `gs://kfinance032926-market-cache` (us-central1) |
| Runtime SA | `firebase-app-hosting-compute@kfinance032926.iam.gserviceaccount.com` |
| Role | `roles/storage.objectAdmin` |
| App Hosting env | `MARKET_CACHE_BUCKET=kfinance032926-market-cache` |

Recreate if needed:

```bash
gcloud storage buckets create gs://kfinance032926-market-cache \
  --project=kfinance032926 \
  --location=us-central1 \
  --uniform-bucket-level-access \
  --public-access-prevention

SA="firebase-app-hosting-compute@kfinance032926.iam.gserviceaccount.com"
gcloud storage buckets add-iam-policy-binding gs://kfinance032926-market-cache \
  --member="serviceAccount:${SA}" \
  --role="roles/storage.objectAdmin" \
  --project=kfinance032926
```

After deploy:

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

## Firestore marketMeta (index only)

On successful daily cache write, the server also schedules a **tiny** Firestore
document (`marketMeta/{marketId}`) with `fetchedOn`, `bytes`, `gcsPath`, etc.
This is **not** a second copy of market JSON — see
[`PROGRESSIVE_LOAD_AND_FIRESTORE.md`](./PROGRESSIVE_LOAD_AND_FIRESTORE.md).

```bash
# Enable Firestore API once
gcloud services enable firestore.googleapis.com --project=kfinance032926

# Grant App Hosting compute SA write access
SA="firebase-app-hosting-compute@kfinance032926.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding kfinance032926 \
  --member="serviceAccount:${SA}" \
  --role="roles/datastore.user"
```

`/api/cache/status` merges disk + Firestore meta for footer tooltips.
