# Commodity Data Coverage Documentation

## Overview
This document describes the data sources, coverage, update frequencies, and fallback strategies for commodity data in the kyahoofinance032926 application.

**Last Updated:** 2026-04-10  
**Total Commodity Markets Covered:** 100+  
**Primary Data Sources:** EIA, FRED, World Bank, Yahoo Finance

---

## Data Source Tiers

### Tier 1: Official Government/Institutional (Highest Reliability)
These sources provide authoritative, auditable data with consistent formatting.

| Source | Data Type | Update Frequency | Coverage | API Key Required |
|--------|-----------|-----------------|----------|------------------|
| **EIA** | US Energy | Daily (prices), Weekly (inventories) | US energy only | Yes (free) |
| **FRED** | Macro/Econ | Daily to Monthly | Global prices, US focus | Yes (free) |
| **World Bank** | Global Commodities | Monthly | 40+ commodities | No |
| **BLS** | US Labor/Prices | Monthly | US PPI data | Yes (free) |

### Tier 2: Market Aggregators (Medium Reliability)
Real-time pricing with potential delays and API limitations.

| Source | Data Type | Update Frequency | Coverage | Notes |
|--------|-----------|-----------------|----------|-------|
| **Yahoo Finance** | Futures, ETFs | Real-time (delayed 15min) | Global exchanges | Unofficial API, paid subscription recommended |
| **CoinGecko** | Crypto | Real-time | Crypto only | Official free API, rate limited |

### Tier 3: Calculated/Derived
Computed from Tier 1 and Tier 2 sources.

| Metric | Calculation | Update Frequency |
|--------|-------------|------------------|
| Gold/Oil Ratio | Gold price ÷ Oil price | Real-time (from sources) |
| Contango/Backwardation | Front month - Back month | Real-time |
| Futures Curves | Multiple contract months | Real-time |

---

## Commodity Categories

### Energy (10+ Markets)

#### Oil & Refined Products
| Commodity | Primary Source | Fallback | Frequency | Coverage |
|-----------|---------------|----------|-----------|----------|
| WTI Crude | EIA (PET.RWTC.D) | FRED (DCOILWTICO) → Yahoo (CL=F) | Daily | US domestic |
| Brent Crude | EIA (PET.RBRTE.D) | FRED (DCOILBRENTEU) → Yahoo (BZ=F) | Daily | Europe/Global |
| Regular Gasoline | EIA (EER_EPMRU) | FRED (GASREGW) | Daily/Weekly | US retail |
| Ultra-Low Sulfur Diesel | EIA (EER_EPD2DXL0) | — | Daily | US Gulf Coast |
| Heating Oil | EIA (EER_EPD2F) | Yahoo (HO=F) | Daily | NY Harbor |
| Jet Fuel | EIA (EER_EPK2_VFP) | — | Daily | US Gulf Coast |
| Propane | EIA (EER_EPLLPA) | — | Daily | Mont Belvieu |

#### Natural Gas
| Commodity | Primary Source | Fallback | Frequency | Notes |
|-----------|---------------|----------|-----------|-------|
| Henry Hub Spot | EIA (NG.RNGWHHD.D) | FRED (DHHNGSP) → Yahoo (NG=F) | Daily | US benchmark |
| Natural Gas Storage | EIA (NW2_EPG0_SWO_R48_BCF) | — | Weekly | Thursday 10:30am ET release |

#### Inventory/Supply Data (Weekly)
| Data Series | Source | Release Day | Market Impact |
|-------------|--------|-------------|---------------|
| Crude Oil Stocks | EIA | Wednesday | High - immediate price impact |
| Gasoline Stocks | EIA | Wednesday | Medium |
| Distillate Stocks | EIA | Wednesday | Medium (heating season) |
| Refinery Utilization | EIA | Wednesday | Medium - supply indicator |
| Crude Production | EIA | Wednesday | High - supply indicator |

**Important:** EIA inventory data is released Wednesday 10:30am ET (delayed 1 day if Monday was holiday). This is one of the most market-moving data releases in commodities.

### Metals (30+ Markets)

#### Precious Metals (9 commodities)
| Commodity | Primary Source | Fallback | Frequency | Notes |
|-----------|---------------|----------|-----------|-------|
| Gold | FRED (GOLDAMGBD228NLBM) | World Bank → Yahoo (GC=F) | Daily | London AM fixing |
| Silver | FRED (SILVERUSDQB) | World Bank → Yahoo (SI=F) | Daily | London fixing |
| Platinum | World Bank | Yahoo (PL=F) | Monthly | Automotive catalysts |
| Palladium | World Bank | Yahoo (PA=F) | Monthly | Automotive catalysts |
| Rhodium | World Bank | — | Monthly | Automotive catalysts |
| Iridium | World Bank | — | Monthly | Electronics, medical |
| Ruthenium | World Bank | — | Monthly | Electronics, catalysts |

#### Industrial & Base Metals (10 commodities)
| Commodity | Source | Frequency | Note |
|-----------|--------|-----------|------|
| Copper | World Bank → FRED (PCOPP) | Monthly | Global benchmark |
| Aluminum | World Bank → FRED (PALUM) | Monthly | LME pricing |
| Iron Ore | World Bank | Monthly | China import benchmark |
| Lead | World Bank | Monthly | LME |
| Nickel | World Bank | Monthly | Stainless steel input |
| Tin | World Bank | Monthly | Electronics |
| Zinc | World Bank | Monthly | Galvanizing |
| Copper Ore | World Bank | Monthly | Raw copper feedstock |
| Bauxite | World Bank | Monthly | Aluminum ore |

#### Battery & Energy Transition Metals (5 commodities)
| Commodity | Source | Frequency | Notes |
|-----------|--------|-----------|-------|
| Lithium | World Bank | Monthly | Critical for EV batteries |
| Cobalt | World Bank | Monthly | Essential for battery cathodes |
| Manganese | World Bank | Monthly | Steel production, batteries |
| Molybdenum | World Bank | Monthly | Steel alloys, catalysts |
| Uranium | World Bank | Monthly | Nuclear power fuel |

#### Steel-making & Alloy Metals (5 commodities)
| Commodity | Source | Frequency | Notes |
|-----------|--------|-----------|-------|
| Chromium | World Bank | Monthly | Stainless steel production |
| Vanadium | World Bank | Monthly | Steel alloys, battery storage |
| Tungsten | World Bank | Monthly | High-strength alloys, cutting tools |
| Antimony | World Bank | Monthly | Flame retardants, batteries |
| Titanium | World Bank | Monthly | Aerospace, medical implants |

#### Rare Earth Elements (1 commodity)
| Commodity | Source | Frequency | Notes |
|-----------|--------|-----------|-------|
| Rare Earth Elements | World Bank | Monthly | Magnet materials, electronics |

**Industrial Metal Limitations:** Free daily pricing for industrial metals is scarce. World Bank provides monthly averages with a 2-month lag. For real-time trading, paid services (LME, CME) or Yahoo futures data are needed.

### Agriculture (50+ Markets)

#### Grains (9 commodities)
| Commodity | Primary Source | Fallback | Frequency |
|-----------|---------------|----------|-----------|
| Corn | World Bank → FRED (PMAIZMTUSDM) | Yahoo (ZC=F) | Monthly/Daily |
| Wheat (US SRW) | World Bank → FRED (PWHEAMTUSDM) | Yahoo (ZW=F) | Monthly/Daily |
| Wheat (US HRW) | World Bank | — | Monthly |
| Soybeans | World Bank → FRED (PSOYBUSDM) | Yahoo (ZS=F) | Monthly/Daily |
| Soybean Meal | World Bank | — | Monthly |
| Soybean Oil | World Bank | — | Monthly |
| Rice | World Bank → FRED (PRICENPQUSDM) | — | Monthly |
| Barley | World Bank | — | Monthly |
| Sorghum | World Bank | — | Monthly |
| Oats | World Bank | Yahoo (ZO=F) | Monthly/Real-time |

#### Oilseeds & Vegetable Oils (8 commodities)
| Commodity | Source | Frequency | Note |
|-----------|--------|-----------|------|
| Rapeseed/Canola | World Bank | Monthly | Major oilseed crop |
| Sunflower Oil | World Bank | Monthly | Major cooking oil |
| Rapeseed Oil | World Bank | Monthly | Canola oil |
| Olive Oil | World Bank | Monthly | Mediterranean staple |
| Peanuts | World Bank | Monthly | Major oilseed and snack |
| Peanut Oil | World Bank | Monthly | — |
| Copra | World Bank | Monthly | Dried coconut kernel |
| Cottonseed Oil | World Bank | Monthly | — |

#### Softs (7 commodities)
| Commodity | Source | Frequency | Note |
|-----------|--------|-----------|------|
| Coffee (Arabica) | World Bank → Yahoo (KC=F) | Monthly/Real-time | ICE benchmark |
| Coffee (Robusta) | World Bank | Monthly | London benchmark |
| Cocoa | World Bank | Monthly | London benchmark |
| Sugar (World) | World Bank → Yahoo (SB=F) | Monthly/Real-time | Global surplus/deficit |
| Sugar (EU) | World Bank | Monthly | Protected market |
| Sugar (US) | World Bank | Monthly | Protected market |
| Cotton | World Bank → Yahoo (CT=F) | Monthly/Real-time | A-Index benchmark |

#### Spices (8 commodities)
| Commodity | Source | Frequency | Note |
|-----------|--------|-----------|------|
| Pepper | World Bank | Monthly | Black pepper |
| Ginger | World Bank | Monthly | — |
| Turmeric | World Bank | Monthly | — |
| Cardamom | World Bank | Monthly | — |
| Cloves | World Bank | Monthly | — |
| Cinnamon | World Bank | Monthly | — |
| Vanilla | World Bank | Monthly | — |
| Nutmeg | World Bank | Monthly | — |
| Mace | World Bank | Monthly | — |

#### Fruits (4 commodities)
| Commodity | Source | Frequency |
|-----------|--------|-----------|
| Apples | World Bank | Monthly |
| Mangos | World Bank | Monthly |
| Pineapples | World Bank | Monthly |
| Grapes | World Bank | Monthly |
| Oranges | World Bank | Monthly |
| Bananas (Europe) | World Bank | Monthly |
| Bananas (US) | World Bank | Monthly |

#### Natural Fibers (3 commodities)
| Commodity | Source | Frequency | Note |
|-----------|--------|-----------|------|
| Wool | World Bank | Monthly | Coarse wool |
| Silk | World Bank | Monthly | — |
| Jute | World Bank | Monthly | Natural fiber |
| Sisal | World Bank | Monthly | Natural fiber |

#### Other Agriculture (10+ commodities)
| Commodity | Source | Frequency |
|-----------|--------|-----------|
| Palm Oil | World Bank | Monthly |
| Coconut Oil | World Bank | Monthly |
| Groundnut Oil | World Bank | Monthly |
| Fish Meal | World Bank | Monthly |
| Tea (multiple origins) | World Bank | Monthly |
| Tobacco | World Bank | Monthly |
| Logs (Cameroon, Malaysia) | World Bank | Monthly |
| Sawn Wood | World Bank | Monthly |
| Plywood | World Bank | Monthly |
| Rubber (TSR20, RSS3) | World Bank | Monthly |
| Honey | World Bank | Monthly |
| Milk | World Bank | Monthly |
| Cheese | World Bank | Monthly |
| Butter | World Bank | Monthly |

### Livestock (15+ Markets)

| Commodity | Primary Source | Frequency | Note |
|-----------|---------------|-----------|------|
| Beef | World Bank → FRED (PBEEFUSDQ) | Monthly | Cattle futures (LE=F) via Yahoo |
| Chicken/Poultry | World Bank → FRED (PPOULTUSDQ) | Monthly |
| Lamb | World Bank | Monthly |
| Shrimp | World Bank | Monthly | Thailand benchmark |
| Pork | World Bank | Monthly | Hog prices |
| Mutton | World Bank | Monthly |
| Salmon | World Bank | Monthly |
| Tilapia | World Bank | Monthly |
| Eggs | World Bank | Monthly |
| Milk Powder | World Bank | Monthly |
| Live Cattle | World Bank | Yahoo (LE=F) | Monthly/Real-time |
| Feeder Cattle | World Bank | Yahoo (GF=F) | Monthly/Real-time |
| Lean Hogs | World Bank | Yahoo (HE=F) | Monthly/Real-time |

---

## Data Freshness Indicators

### Timestamp Fields
All commodity data includes the following metadata fields:

```json
{
  "value": 75.23,
  "date": "2026-04-09",
  "_source": "EIA",
  "_lastUpdated": "2026-04-10T14:30:00Z",
  "_updateFrequency": "Daily",
  "_dataAge": "1 day ago"
}
```

### UI Indicators
The dashboard displays data freshness with color coding:

| Age | Color | Indicator | Action Needed |
|-----|-------|-----------|---------------|
| Real-time | Green | "Live" | None |
| < 24 hours | Green | "Updated today" | None |
| 1-3 days | Yellow | "X days old" | None |
| 1 week | Orange | "1 week old" | Check for API issues |
| > 2 weeks | Red | "Stale data" | Verify source availability |

### Source-Specific Lag Information

| Source | Typical Lag | Holiday Schedule |
|--------|-------------|------------------|
| EIA Daily Prices | 1 day | US holidays |
| EIA Weekly | 2-3 days | Wednesday release |
| FRED Daily | 1 day | US holidays |
| FRED Monthly | 15-45 days | Variable |
| World Bank | 45-75 days | End of month |
| Yahoo Finance | 15 minutes | Exchange hours |

---

## Fallback Strategy

### Primary → Secondary → Tertiary Chain

**Example: WTI Crude Price**

```
1. EIA (PET.RWTC.D) - Daily official US price
   ↓ (if fails/unavailable)
2. FRED (DCOILWTICO) - Alternative official source
   ↓ (if fails)
3. Yahoo Finance (CL=F) - Futures price (real-time)
   ↓ (if fails)
4. Cached last known value (stale data warning)
```

### Fallback Trigger Conditions

A fallback is triggered when:
1. API returns error (429, 500, timeout)
2. Data is older than expected (stale detection)
3. API key invalid or missing
4. Value is null/missing
5. Rate limit approached (preventive)

### Fallback Priority Rules

1. **Official sources first** - Always prefer EIA/FRED/World Bank over aggregators
2. **Frequency match** - Try to match update frequency (daily → daily)
3. **Regional match** - US data → US alternative, not European equivalent
4. **Freshness check** - Even fallback data must pass age check
5. **Stale warning** - If all sources fail, show cached data with red "stale" badge

---

## API Keys Required

### Must Have (Free)
```bash
FRED_API_KEY=632bbf3d29c9613e7f03cab6a8472406    # research.stlouisfed.org
EIA_API_KEY=***REDACTED***  # eia.gov/opendata
```

### Optional
```bash
# Yahoo OAuth - for real-time futures (paid subscription recommended)
YAHOO_APP_ID=xxx
YAHOO_CLIENT_ID=xxx
YAHOO_CLIENT_SECRET=xxx

# CoinGecko - for crypto (free tier available)
COINGECKO_API_KEY=optional_for_higher_limits

# BLS - for additional US labor data
BLS_API_KEY=xxx
```

### No Key Required
- World Bank (direct HTTP)
- CFTC COT data (public API)
- Frankfurter (free forex API)

---

## Coverage Gaps & Workarounds

### What's Missing from Free Tier

| Desired Data | Available? | Workaround |
|--------------|------------|------------|
| Live futures order book | No | Yahoo delayed (15min) |
| Real-time spot metals | No | FRED daily, Yahoo futures |
| LME industrial metals | No | World Bank monthly |
| Agricultural futures | Partial | Yahoo for US contracts only |
| CME live data | No | EIA/FRED daily fundamentals |
| Softs futures (ICE) | No | Yahoo for US-listed only |
| Intraday commodity prices | No | 15-min delayed via Yahoo |
| Options on futures | No | Not available free |

### Paid Alternatives ($50-200/month)

If you need real-time data:

| Service | Cost | Coverage | Best For |
|---------|------|----------|----------|
| Polygon.io | $49/mo | US stocks, some futures | Real-time US futures |
| Financial Modeling Prep | $15-50/mo | 50+ markets | Broad coverage |
| Trading Economics | Free-250 calls/month | Global macro | Limited volume |
| Twelve Data | $29/mo | Stocks, forex, some commodities | Real-time stocks |

---

## Rate Limits & Best Practices

### Current Limits

| Source | Limit | Window | Strategy |
|--------|-------|--------|----------|
| EIA | ~1000/day | Daily | Cache aggressively |
| FRED | 120/minute | Minute | Batch requests |
| Yahoo Finance | Undocumented | Unknown | Cache, stagger, monitor 429s |
| CoinGecko | 10-30/min | Minute | Respect limits, use pro for scale |
| World Bank | No limit | — | Monthly download preferred |

### Recommended Caching Strategy

```javascript
// Tier 1 data (EIA/FRED daily) - 4 hour cache
// Tier 2 data (Yahoo real-time) - 15 minute cache
// Tier 3 data (World Bank monthly) - 24 hour cache
```

---

## Maintenance Notes

### Monthly Tasks
- Verify API keys are active
- Check EIA release calendar for holiday delays
- Review World Bank for new commodity additions
- Monitor Yahoo Finance for API changes (unofficial)

### Quarterly Tasks
- Review data quality (missing values, outliers)
- Test fallback chains (simulate API failures)
- Update documentation if sources change
- Evaluate new free APIs (USDA, UN FAO, etc.)

### When Things Break

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| All EIA data stale | API key expired | Regenerate at eia.gov |
| Yahoo returning null | Rate limited or API change | Wait, then fallback |
| World Bank missing | Monthly update lag | Normal - use FRED if available |
| All futures null | Outside exchange hours | Expected - show last close |

---

## For Future Developers

### Adding a New Commodity

1. Check `server/dataSources/commoditySources.js`
2. Find existing commodity in same category for template
3. Define primary source (prefer official)
4. Add 1-2 fallbacks
5. Document in this file
6. Add to registry in `commoditySources.js`
7. Test fallback chain by simulating failures

### Adding a New Data Source

1. Implement fetcher in `server/dataSources/unifiedFetcher.js`
2. Define update frequency in `UPDATE_FREQUENCIES`
3. Add tier classification (`DATA_SOURCE_TIERS`)
4. Update this documentation
5. Configure rate limiting in `server/lib/rateLimits.js`

---

## Summary Statistics

| Category | Count | Primary Source | Fallback Available |
|----------|-------|----------------|-------------------|
| Energy | 12 | EIA | Yes (FRED/Yahoo) |
| Precious Metals | 9 | FRED/World Bank | Yes (Yahoo) |
| Industrial Metals | 10 | World Bank | Partial (FRED) |
| Battery/Alloy Metals | 10 | World Bank | Limited |
| Agriculture - Grains | 10 | World Bank/FRED | Partial (Yahoo) |
| Agriculture - Oilseeds | 8 | World Bank | Limited |
| Agriculture - Softs | 15 | World Bank | Partial (Yahoo) |
| Agriculture - Spices | 9 | World Bank | Limited |
| Agriculture - Fruits | 7 | World Bank | Limited |
| Agriculture - Other | 15 | World Bank | Limited |
| Livestock | 15 | World Bank/FRED | Partial (Yahoo) |
| **Total** | **100+** | Mixed | **80% have fallback** |

**Data Freshness Summary:**
- Real-time: 8 markets (Yahoo futures)
- Daily: 20 markets (EIA/FRED)
- Weekly: 5 markets (EIA inventories)
- Monthly: 20+ markets (World Bank)

---

*This documentation should be updated whenever new data sources are added or existing sources change their API policies.*
