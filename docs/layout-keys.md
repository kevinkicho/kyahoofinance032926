# Bento layout storage keys

When default bento grid positions/sizes change, **bump the `storageKey`** passed
to `BentoWrapper` so users pick up the new layout instead of a stale
`localStorage` snapshot.

| Market | Storage key (current) |
|--------|------------------------|
| Sentiment | `sentiment-layout-v5` |
| Calendar | `calendar-layout-v6` |
| Credit | `credit-layout-v5` |
| Commodities | see `CommoditiesDashboard` |

Other markets: search for `storageKey=` under `src/markets/`.
