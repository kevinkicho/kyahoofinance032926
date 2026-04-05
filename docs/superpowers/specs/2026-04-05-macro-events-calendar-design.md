# Macro Events Calendar — Design Spec

**Date:** 2026-04-05
**Type:** New market tab (Sub-project 13)

---

## Goal

Add a 13th market tab — **Calendar** (rose `#f43f5e`, `cal-` CSS prefix, icon `📅`) — with 4 sub-views showing upcoming macro events: economic data releases, central bank meetings, earnings dates, and key US releases. Nearly all data is live from day one.

---

## Data Sources

| Sub-view | API | Auth | Notes |
|---|---|---|---|
| Economic Calendar | Econdb `/api/events/` | None required | International events with actual/expected/previous |
| Central Bank Schedule | Static 2026 JSON + FRED live rates | Existing FRED key | Dates published annually; rates live |
| Earnings Season | yahoo-finance2 `quoteSummary` calendarEvents | Existing | 30 mega-cap tickers batched |
| Key Releases | FRED `releases/dates` | Existing FRED key | US macro release schedule |

---

## Server: `/api/calendar` endpoint

Single endpoint using `Promise.allSettled` for all 4 sources. Same two-tier cache (daily file + 300s memory). Added to `CACHEABLE_MARKETS`.

### 1. Economic Calendar (Econdb)

```js
const econdbUrl = `https://www.econdb.com/api/calendar/events/?date_from=${today}&date_to=${plus30d}&importance=3&format=json`;
```

Extract per event:
- `date` (ISO string)
- `country` (2-letter code)
- `event` (indicator name, e.g., "CPI YoY")
- `actual` (number or null if not yet released)
- `expected` (consensus forecast)
- `previous` (prior reading)
- `importance` (1-3 scale)

Filter to importance >= 2. Sort by date ascending. Cap at 50 events.

**Response shape:**
```js
economicEvents: [{ date, country, event, actual, expected, previous, importance }]
```

### 2. Central Bank Schedule

Hardcoded 2026 meeting dates for 4 major central banks:

```js
const CB_SCHEDULE = {
  Fed:  { dates: ['2026-01-28','2026-03-18','2026-05-06','2026-06-17','2026-07-29','2026-09-16','2026-11-04','2026-12-16'], fredSeries: 'FEDFUNDS' },
  ECB:  { dates: ['2026-01-22','2026-03-05','2026-04-16','2026-06-04','2026-07-16','2026-09-10','2026-10-29','2026-12-17'], fredSeries: 'ECBDFR' },
  BOE:  { dates: ['2026-02-05','2026-03-19','2026-05-07','2026-06-18','2026-08-06','2026-09-17','2026-11-05','2026-12-17'], fredSeries: 'BOERUKQ' },
  BOJ:  { dates: ['2026-01-22','2026-03-12','2026-04-30','2026-06-18','2026-07-16','2026-09-17','2026-10-29','2026-12-17'], fredSeries: null },
};
```

For each bank:
- Find next meeting date (first date >= today)
- Fetch current rate via `fetchFredLatest(fredSeries)` (BOJ: use hardcoded 0.5 or fetch from existing globalMacro data)
- Compute days until next meeting
- Determine last decision: compare current rate to rate from previous meeting context (simplified: just show current rate + next date)

**Response shape:**
```js
centralBanks: [{ bank, rate, nextMeeting, daysUntil, previousRate }]
```

### 3. Earnings Season

Batch `quoteSummary` for 30 mega-cap tickers:

```js
const EARNINGS_TICKERS = [
  'AAPL','MSFT','NVDA','AMZN','META','GOOGL','JPM','GS','BAC','WFC',
  'XOM','CVX','UNH','LLY','JNJ','PG','WMT','HD','COST','NFLX',
  'TSLA','V','MA','AVGO','CRM','ORCL','ADBE','AMD','INTC','PEP',
];
```

For each, call `yf.quoteSummary(ticker, { modules: ['calendarEvents', 'defaultKeyStatistics'] })`:
- `calendarEvents.earnings.earningsDate[0]` -> next earnings date
- `defaultKeyStatistics.trailingEps` -> previous EPS
- `calendarEvents.earnings.earningsAverage` -> EPS estimate (if available)
- `defaultKeyStatistics.marketCap` -> market cap

Filter: only include stocks with earnings date within next 60 days and in the future. Sort by date ascending. Include ticker name from a metadata lookup.

**Response shape:**
```js
earningsSeason: [{ ticker, name, date, epsEst, epsPrev, marketCapB }]
```

### 4. Key Releases (FRED)

```js
const fredReleasesUrl = `https://api.stlouisfed.org/fred/releases/dates?api_key=${FRED_API_KEY}&file_type=json&include_release_dates_with_no_data=true&offset=0&limit=100`;
```

Filter to major releases by release_id:
```js
const MAJOR_RELEASES = {
  10:  { name: 'CPI', category: 'inflation' },
  46:  { name: 'PPI', category: 'inflation' },
  53:  { name: 'GDP', category: 'growth' },
  50:  { name: 'Employment Situation', category: 'employment' },
  103: { name: 'Retail Sales', category: 'consumer' },
  13:  { name: 'PCE Price Index', category: 'inflation' },
  82:  { name: 'Consumer Confidence', category: 'sentiment' },
  14:  { name: 'Industrial Production', category: 'growth' },
  205: { name: 'Housing Starts', category: 'housing' },
  58:  { name: 'ISM Manufacturing', category: 'growth' },
};
```

Extract: release name, date, category. Sort by date ascending.

Note: FRED releases/dates gives dates only, not consensus forecasts (proprietary data). Previous values can be pulled from already-fetched FRED series where available.

**Response shape:**
```js
keyReleases: [{ name, date, category, previousValue }]
```

---

## Client Components

### CalendarMarket.jsx

Root component with 4 sub-tabs: `economic`, `central-banks`, `earnings`, `releases`. Same tab pattern as all other markets. Rose accent `#f43f5e`.

### EconomicCalendar.jsx

Table sorted by date. Columns: Date, Country (flag emoji via 2-letter code), Event, Actual, Expected, Previous, Surprise.

- Surprise = actual - expected (green if positive, red if negative, grey if actual is null)
- Country displayed as flag emoji: `String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))`
- Filter pills at top: "All", "US", "EU", "Asia" (filter by country code)
- Rows with `actual === null` are upcoming (no highlight); rows with actual are released (slightly muted)

### CentralBankSchedule.jsx

4 bank cards in a 2x2 grid:
- Bank name + flag
- Current rate (large, monospace)
- Next meeting date + "in X days" countdown
- Decision badge: rate unchanged = grey "HOLD", rate up from previous = red "HIKE +25bp", rate down = green "CUT -25bp"

Below the cards: a horizontal timeline showing all upcoming meetings for all 4 banks, color-coded (Fed blue, ECB yellow, BOE red, BOJ white).

### EarningsSeason.jsx

Grouped by week. Each week section has a header ("Apr 7–11", "Apr 14–18", etc.). Within each week, a table: Ticker, Name, Date, EPS Est, Prior EPS, Market Cap. Highlight "this week" group with a subtle rose border. Show empty weeks as "No major earnings this week".

### KeyReleases.jsx

Timeline list. Each entry: date (left), release name + category badge (right). Category badges color-coded:
- inflation: red
- employment: blue
- growth: green
- consumer: amber
- housing: orange
- sentiment: purple

Previous value shown as small text below release name where available.

---

## Files

### New files
- `src/markets/calendar/CalendarMarket.jsx` — root component
- `src/markets/calendar/CalendarMarket.css` — rose accent styles
- `src/markets/calendar/components/EconomicCalendar.jsx`
- `src/markets/calendar/components/CentralBankSchedule.jsx`
- `src/markets/calendar/components/EarningsSeason.jsx`
- `src/markets/calendar/components/KeyReleases.jsx`
- `src/markets/calendar/components/CalendarComponents.css` — shared component styles
- `src/markets/calendar/data/mockCalendarData.js` — mock data for all 4 segments
- `src/markets/calendar/data/useCalendarData.js` — hook with anyReplaced pattern
- `src/__tests__/calendar/useCalendarData.test.js` — 8 tests (mock fallback + live guards)

### Modified files
- `server/index.js` — add `/api/calendar` endpoint
- `src/hub/markets.config.js` — add calendar entry
- `src/hub/HubLayout.jsx` — add CalendarMarket import + registration
- `vite.config.js` — add `/api/calendar` proxy

---

## Hook Guards

```js
const anyReplaced =
  data.economicEvents?.length >= 5 ||
  data.centralBanks?.length >= 3 ||
  data.earningsSeason?.length >= 5 ||
  data.keyReleases?.length >= 3;
```

---

## Limitations (no free API)

- **No consensus forecasts** for FRED releases — only dates + previous values
- **BOJ rate** — no reliable FRED series; use hardcoded current rate or derive from globalMacro endpoint
- **Econdb** — free tier limited to ~100 req/day unauthenticated; daily cache means 1 request/day (no issue)

---

## Tests

8 tests in `useCalendarData.test.js`:
- Mock fallback for all 4 segments (economicEvents, centralBanks, earningsSeason, keyReleases)
- Live data replaces mock when guards pass
- isLive set correctly
- fetchedOn/isCurrent propagated
