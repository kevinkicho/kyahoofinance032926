import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import FXDashboard from './components/FXDashboard';
import { exchangeRates } from '../../utils/constants';

function getFXProps(centralData) {
  const d = centralData.data || {};
  const fallback = { USD: 1, ...exchangeRates };
  const spotRates = d.spotRates || d.frankfurterLatest || fallback;
  const prevRates = d.prevRates || d.frankfurterPrev || fallback;
  const changes = Object.keys(spotRates).reduce((acc, code) => {
    if (code === 'USD') return { ...acc, [code]: 0 };
    const prev = prevRates[code] || spotRates[code];
    acc[code] = prev ? -((spotRates[code] - prev) / prev * 100) : 0;
    return acc;
  }, {});

  // The Frankfurter API returns history as { "2026-05-22": { CAD: 1.39, ... }, ... }
  // keyed by date. The CurrencyCorrelationMatrix component expects history keyed by
  // currency code with array values: { EUR: [rate1, rate2, ...], GBP: [...], ... }.
  // Transform the date→currency structure into currency→array so the correlation
  // panel can compute 30-day correlations correctly.
  const rawHistory = d.history || {};
  let history = rawHistory;
  if (rawHistory && typeof rawHistory === 'object' && !Array.isArray(rawHistory)) {
    const sampleKey = Object.keys(rawHistory)[0];
    const sampleVal = sampleKey ? rawHistory[sampleKey] : null;
    // Detect date-keyed structure: keys look like dates and values are currency→rate objects
    const isDateKeyed = sampleKey && /^\d{4}-\d{2}-\d{2}$/.test(sampleKey)
      && sampleVal && typeof sampleVal === 'object' && !Array.isArray(sampleVal);
    if (isDateKeyed) {
      const sortedDates = Object.keys(rawHistory).sort();
      const currencySet = new Set();
      for (const dt of sortedDates) {
        if (rawHistory[dt] && typeof rawHistory[dt] === 'object') {
          Object.keys(rawHistory[dt]).forEach(c => currencySet.add(c));
        }
      }
      history = {};
      for (const ccy of currencySet) {
        history[ccy] = sortedDates.map(dt => rawHistory[dt]?.[ccy] ?? null).filter(v => v != null);
      }
    }
  }

  return {
    spotRates,
    prevRates,
    changes,
    changes1w: d.changes1w || {},
    changes1m: d.changes1m || {},
    sparklines: d.sparklines || {},
    history,
    fredFxRates: d.fredFxRates,
    reer: d.reer,
    rateDifferentials: d.rateDifferentials,
    dxyHistory: d.dxyHistory,
    cotData: d.cotData || {},
    cotHistory: d.cotHistory,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function FXMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getFXProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    // FXSidebar AND the top KPI strip now both live as real bento panels
    // inside FXDashboard's BentoWrapper; the outer `--with-sidebar` grid
    // and the standalone `.fx-kpi-panel` are gone.
    <div className="fx-market" role="region" aria-label="FX">
      <div className="fx-market-main">
        <FXDashboard
          spotRates={props.spotRates}
          prevRates={props.prevRates}
          changes={props.changes}
          changes1w={props.changes1w}
          changes1m={props.changes1m}
          sparklines={props.sparklines}
          history={props.history}
          fredFxRates={props.fredFxRates}
          reer={props.reer}
          rateDifferentials={props.rateDifferentials}
          dxyHistory={props.dxyHistory}
          cotData={props.cotData}
          cotHistory={props.cotHistory}
          isLive={props.isLive}
          lastUpdated={props.lastUpdated}
          fetchLog={props.fetchLog}
          error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
          isHistorical={props.isHistorical} asOfDate={props.asOfDate}
        />
      </div>
    </div>
  );
}

export default React.memo(FXMarket);
