import { useMemo, useState, useEffect, useRef } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

// ── Per-panel data key requirements ──
// Maps market → panel ID → array of data keys that must be non-null
// for the panel to have usable data. Used to check non-active tab health
// from DataContext without needing DOM access.
const PANEL_DATA_KEYS = {
  fx: {
    'kpi': ['spotRates'],
    'sidebar': ['spotRates'],
    'movers': ['changes'],
    'dxy': ['dxyHistory'],
    'cot': ['cotHistory'],
    'corr': ['history'],
    'reer': ['reer'],
    'ratediff': ['rateDifferentials'],
    'carry': ['rateDifferentials'],
    'rate-dashboard': ['rateDifferentials'],
  },
  bonds: {
    'kpi': ['treasuryRates'],
    'yield': ['yieldCurveData'],
    'metrics': ['spreadData'],
    'credit': ['spreadData'],
    'realYield': ['realYieldHistory'],
    'ratings': ['creditRatings'],
    'curvespreads': ['spreadHistory'],
    'fed': ['fedBalanceSheetHistory'],
    'm2': ['m2HistoryData'],
    'cpi': ['cpiComponents'],
    'debtgdp': ['debtToGdpHistory'],
    'breakevens': ['breakevensData'],
    'duration': ['durationLadder'],
    'macro': ['macroData'],
    'foreign-holders': [],
    'money-market': [],
    'auctions': [],
    'ecb-yields': [],
    'global-rates': [],
    'treasury-cost': [],
  },
  equities: {
    'kpi': [],
    'heatmap': [],
    'sidebar': [],
    'ml-explorer': [],
    'portfolio': [],
    'radar': [],
    'universe-updates': [],
    'sec-fundamentals': [],
    'sec-filings': [],
  },
  commodities: {
    'sidebar': [],
    'prices': ['commodityPrices'],
    'futures': ['futuresCurve'],
    'sector': ['sectorPerformance'],
    'supply': ['supplyDemand'],
    'wti-brent': ['wtiBrentSpread'],
    'cot': ['cotPositioning'],
    'comfx': ['commodityFx'],
    'usda-ag': ['usdaAgPrices'],
    'eia-petrol': ['eiaPetroleum'],
    'physical-pressure': [],
    'materials-grid': [],
    'criticality': [],
    'battery-chain': [],
    'precious-complex': [],
    'regime': [],
    'energy-stack': [],
    'curve-board': [],
    'material-detail': [],
    'exposure-matrix': [],
    'fao-prices': [],
  },
  derivatives: {
    'kpi': [],
    'metrics': [],
    'vixterm': ['vixTermStructure'],
    'vix1y': ['vix1Year'],
    'skew': ['skewIndex'],
    'volsurf': ['volSurface'],
    'flow': ['optionsFlow'],
    'gamma': ['gammaExposure'],
    'volprem': ['volPremium'],
    'cftc-tff': [],
    'bis-otc': [],
  },
  globalMacro: {
    'kpi': [],
    'sidebar': [],
    'scorecard': [],
    'gdp': ['gdpGrowth'],
    'cpi': ['cpiInflation'],
    'rates': ['centralBankRates'],
    'debt': ['debtMonitor'],
    'activity': ['economicActivity'],
    'cli': ['oecdLeadingIndicators'],
    'imf-reserves': [],
    'imf-cofer': [],
    'wb-trade': [],
    'wb-dev': [],
    'ecb-eur': [],
    'tga-balance': [],
    'gdpnow': [],
    'fomc-sep': [],
    'cleveland': [],
    'bea-accounts': [],
    'eurostat': [],
    'oecd-direct': [],
    'bea-income': [],
    'global-liquidity': [],
  },
  realEstate: {
    'metrics': [],
    'shiller': ['caseShiller'],
    'reitetf': ['reitEtf'],
    'reitperf': ['reitPerformance'],
    'foreclosure': ['distressIndicators'],
    'mba': ['mortgageRates'],
    'cre': ['creDelinquencies'],
    'caprate': ['capRates'],
    'afford': ['affordabilityIndex'],
    'supply': ['supplyDemand'],
    'hud-afford': [],
    'afford-stack': [],
    'census-housing': [],
    'census-trade': [],
    'census-trends-housing': [],
    'census-trends-trade': [],
    'fhfa-hpi': [],
  },
  insurance: {
    'kpi': [],
    'hyoas': ['hyOasSpread'],
    'catloss': ['catLosses'],
    'crhist': ['combinedRatioHistory'],
    'crline': ['combinedRatioByLine'],
    'reinsrates': ['reinsurancePricing'],
    'reserves': ['reserveAdequacy'],
    'catbonds': ['catBondSpreads'],
    'etfs': ['sectorEtf'],
    'catastrophes': [],
    'ins-penetration': [],
    'combined-ratios': [],
    'cat-exposure': [],
    'usgs-minerals': [],
    'ecb-supervisory': [],
  },
  sentiment: {
    'sidebar': [],
    'key-metrics': [],
    'fear-greed': ['fearGreedIndex'],
    'fsi': ['financialStressIndex'],
    'cftc': ['cftcPositioning'],
    'cross-asset': ['crossAssetReturns'],
    'risk-dashboard': ['riskDashboard'],
    'leverage': ['leverageMetrics'],
    'news-sentiment': [],
    'fed-risk-mood': [],
  },
  credit: {
    'kpi': [],
    'key-metrics': [],
    'credit-spreads': ['creditSpreads'],
    'spread-summary': ['spreadSummary'],
    'em-spread': ['emSpreadHistory'],
    'em-yields': ['emEtfYields'],
    'cp-rates': ['commercialPaper'],
    'clo-tranches': ['cloTranches'],
    'default-rates': ['defaultRates'],
    'delinquency': ['delinquencyRates'],
    'bank-sector': ['fdicBankSector'],
    'credit-quality': [],
    'muni-market': [],
    'bank-stress': ['bankStressMonitor'],
    'ted-spread': ['tedSpread'],
  },
  calendar: {
    'kpi': [],
    'economic': ['economicCalendar'],
    'sidebar': [],
    'cb-rates': [],
    'cb-timeline': [],
    'earnings': ['earningsSeason'],
    'key-data': [],
    'treasury': [],
    'options': [],
    'release-impact': [],
    'catalyst-wall': [],
  },
  equitiesDeepDive: {
    'kpi': [],
    'sidebar': [],
    'valuation': ['valuationMetrics'],
    'etf': ['etfPerformance'],
    'factor-favor': ['factorInFavor'],
    'sector-beat': ['sectorBeatRate'],
    'shorted': ['mostShorted'],
    'scores': ['stockFactorScores'],
    'earnings': ['upcomingEarnings'],
    'institutions': ['topInstitutions'],
    'insider': ['insiderTrading'],
    'earnings-quality': [],
  },
  crypto: {
    'sidebar': [],
    'top-cryptos': ['topCryptos'],
    'fear-greed': ['fearGreedIndex'],
    'funding': ['fundingRates'],
    'defi-tvl': ['defiTvl'],
    'exchanges': ['topExchanges'],
    'onchain': ['onChainMetrics'],
    'onchain-chart': ['btcHashrate'],
  },
  bls: {
    'kpi': [],
    'trends-top': ['blsTrends'],
    'trends-bottom': ['blsTrends'],
    'jolts': ['joltsData'],
    'productivity': ['productivityData'],
    'cpi-components': ['cpiComponents'],
    'ppi-by-industry': ['ppiByIndustry'],
    'eci': ['eciData'],
    'unemployment-duration': ['unemploymentDuration'],
  },
  eia: {
    'prices': ['electricityPrices'],
    'consumption': ['electricityConsumption'],
    'trends': ['priceTrends'],
    'co2': ['co2Emissions'],
    'petroleum': ['petroleumData'],
    'natural-gas': ['naturalGasData'],
  },
  alerts: {
    'kpi': [],
    'active-alerts': [],
    'alert-rules': [],
  },
  watchlist: {
    'kpi': [],
    'my-tickers': [],
    'my-metrics': [],
  },
  analytics: {
    'kpi': [],
    'provenance': [],
    'diagnostics': [],
    'server': [],
    'api-usage': [],
    'source-health': [],
    'endpoints': [],
    'freshness': [],
    'error-log': [],
    'mem-cache': [],
    'cache-files': [],
    'routes': [],
    'panel-trace': [],
    'coverage-matrix': [],
  },
};

// Scan DOM for [data-panel-key] elements and return { panelKey: status }.
// Only finds panels that are CURRENTLY RENDERED (active market tab).
function scanDom() {
  if (typeof document === 'undefined') return {};
  const els = document.querySelectorAll('[data-panel-key]');
  const map = {};
  els.forEach(el => {
    const key = el.getAttribute('data-panel-key');
    if (!key) return;
    const text = el.textContent || '';
    const footer = el.querySelector('.bento-footer, [class*="footer"]');
    const footerText = footer?.textContent || '';
    if (/stale/i.test(footerText)) {
      map[key] = 'stale';
    } else if (/\bno data\b|\bunavailable\b|\bnot available\b/i.test(text) && text.length < 200) {
      map[key] = 'null';
    } else {
      map[key] = 'ok';
    }
  });
  return map;
}

// Check per-panel data availability from DataContext.
function healthFromMarketData(marketCtx, panels, marketId) {
  if (!marketCtx) return Object.fromEntries(panels.map(p => [p.id, 'unknown']));
  if (marketCtx.isLoading) return Object.fromEntries(panels.map(p => [p.id, 'loading']));
  if (marketCtx.error) return Object.fromEntries(panels.map(p => [p.id, 'null']));

  const data = marketCtx.data;
  if (!data) return Object.fromEntries(panels.map(p => [p.id, 'unknown']));

  const keyMap = PANEL_DATA_KEYS[marketId] || {};
  const health = {};

  for (const p of panels) {
    const requiredKeys = keyMap[p.id];
    if (!requiredKeys || requiredKeys.length === 0) {
      // No data keys defined — can't verify from DataContext alone.
      // Mark as 'ok' if the market has data (panel likely renders).
      health[p.id] = 'ok';
    } else {
      // Check if ALL required keys are present and non-null
      const allPresent = requiredKeys.every(k => {
        const val = data[k];
        if (val == null) return false;
        if (Array.isArray(val) && val.length === 0) return false;
        if (typeof val === 'object' && Object.keys(val).length === 0) return false;
        return true;
      });
      health[p.id] = allPresent ? 'ok' : 'null';
    }
  }
  return health;
}

export function usePanelHealth(marketId, activeMarketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;

  const cacheRef = useRef({});
  const [, forceUpdate] = useState(0);

  // DOM observer — triggers re-render when panels change in the DOM
  useEffect(() => {
    const obs = new MutationObserver(() => forceUpdate(n => n + 1));
    obs.observe(document.body || document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-panel-key'], characterData: true,
    });
    return () => obs.disconnect();
  }, []);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};

    const isDomScanValid = marketId === activeMarketId;

    if (isDomScanValid) {
      // ── Active market: scan DOM for per-panel status ──
      const domMap = scanDom();
      for (const p of panels) {
        if (domMap[p.id]) {
          health[p.id] = domMap[p.id];
          cacheRef.current[marketId] = cacheRef.current[marketId] || {};
          cacheRef.current[marketId][p.id] = domMap[p.id];
        } else {
          const cached = cacheRef.current[marketId]?.[p.id];
          health[p.id] = cached || 'unknown';
        }
      }
    } else {
      // ── Non-active market: check per-panel data from DataContext ──
      const marketCtx = allMarkets?.[marketId];
      const panelHealth = healthFromMarketData(marketCtx, panels, marketId);
      for (const p of panels) {
        health[p.id] = panelHealth[p.id] || 'unknown';
      }
    }

    return health;
  }, [marketId, activeMarketId, allMarkets]);
}
