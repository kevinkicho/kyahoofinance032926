# Bento layout storage keys

When default bento grid positions/sizes change, **bump the `storageKey`** passed to `BentoWrapper` so users pick up denser layouts instead of a stale `localStorage` snapshot.

| Market | Storage key (current) |
|--------|------------------------|
| Sentiment | `sentiment-layout-v5` |
| Calendar | `calendar-layout-v6` |
| Credit | `credit-layout-v5` |
| Commodities | see `CommoditiesDashboard` |

## Client refresh after data fixes

```js
import { refreshMarket, refreshCriticalMarkets } from '../hub/lib/refreshMarket';

// Single market (forces ?refresh=1 on the API)
await refreshMarket('calendar');

// Credit + sentiment + calendar + commodities
await refreshCriticalMarkets();
```

## Density CI

With the server running:

```bash
DENSITY_BASE=http://localhost:3001 npx vitest run server/__tests__/dataDensity.test.js
```

Series health:

```bash
curl -s http://localhost:3001/api/health/series | jq .
```

## Null / hollow datapoints

Outgoing market payloads are sanitized via `sanitizeMarketPayload` (`server/lib/dataHygiene.js`):

- Applied on **every** response path (fresh fetch + daily/memory cache) in `routeFactory` and on calendar / sentiment / insurance / derivatives.
- Drops all-null loan indices, default-rate shells, F&G indicators, banks without rates, reinsurance rows without price, etc.
- Unit coverage: `server/__tests__/dataHygiene.test.js`
- Live contracts: `server/__tests__/dataDensity.test.js`
