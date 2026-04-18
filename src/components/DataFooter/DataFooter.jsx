import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './DataFooter.css';

const FRED_API_BASE = '/api/fred/observations';

const SOURCE_META = {
  'US Treasury Yields': { desc: 'US Treasury yield curve across tenors (3M\u201330Y)', series: ['DGS3MO', 'DGS6MO', 'DGS1', 'DGS2', 'DGS5', 'DGS7', 'DGS10', 'DGS20', 'DGS30'] },
  'International 10Y Yields': { desc: 'G10 sovereign 10Y yields from FRED', series: ['IRLTLT01DEM156N', 'IRLTLT01JPM156N', 'IRLTLT01GBM156N'] },
  'TIPS Real Yields': { desc: 'Treasury Inflation-Protected Securities real yields', series: ['DFII5', 'DFII10', 'DFII30'] },
  'Credit Spreads (IG/HY/EM/BBB)': { desc: 'Investment-grade, high-yield, EM, BBB credit spread history', series: ['BAMLH0A0HYM2', 'BAMLC0A0CM', 'BAMLEMCBPIOAS', 'BAMLC0A4CBB'] },
  'Spread Indicators': { desc: 'Key spread indicators (10Y-2Y, 10Y-3M, 5Y-30Y)', series: ['T10Y2Y', 'T10Y3M', 'T5Y30'] },
  'Fed Funds Futures': { desc: 'Fed funds futures-implied rate expectations', series: [] },
  'Yield Curve History': { desc: 'Historical yield curve shape data', series: ['DGS2', 'DGS10', 'DGS30'] },
  'Breakevens': { desc: 'Inflation breakeven rates (5Y, 10Y, 5Y5Y forward)', series: ['T5YIE', 'T10YIE', 'T5YIFR'] },
  'Macro Indicators (Fed BS, M2, Debt, Unemp, GDP)': { desc: 'Unemployment, GDP growth, PCE inflation, Fed balance sheet, M2, federal debt', series: ['UNRATE', 'GDP', 'PCEPI', 'WALCL', 'M2SL', 'GFDEBTN'] },
  'Fed Balance Sheet History': { desc: 'Federal Reserve total assets (WALCL)', series: ['WALCL'] },
  'M2 Money Supply History': { desc: 'M2 money supply time series', series: ['M2SL'] },
  'CPI Components': { desc: 'CPI breakdown: all items, core, food, energy', series: ['CPIAUCSL', 'CPILFESL', 'CPIFABSL', 'CPIENGSL'] },
  'Debt-to-GDP History': { desc: 'Federal debt-to-GDP ratio over time', series: ['GFDEGDQ188S'] },
  'Curve Spread History': { desc: 'Historical 10Y-2Y, 10Y-3M, 5Y-30Y spreads', series: ['T10Y2Y', 'T10Y3M', 'T5Y30'] },
  'Treasury Auctions': { desc: 'Recent US Treasury auction results', series: [] },
  'National Debt': { desc: 'Current US federal debt outstanding', series: ['GFDEBTN'] },
  'Treasury Rates': { desc: 'Current Treasury rates by tenor', series: ['DGS3MO', 'DGS2', 'DGS10', 'DGS30'] },
  'Mortgage Spread': { desc: '30Y fixed mortgage rate spread over 10Y Treasury', series: ['MORTGAGE30US'] },
  'Credit Indices (AAA/BAA)': { desc: 'Moody\'s AAA and BAA corporate bond yields', series: ['AAA', 'BAA'] },
  frankfurter: { desc: 'Frankfurter API \u2014 live exchange rates (public, no key needed)', series: [] },
  prev: { desc: 'Previous-day rates from Frankfurter (for 24h change)', series: [] },
  hist: { desc: '30-day rate history from Frankfurter (for sparklines)', series: [] },
  weekHist: { desc: '7-day rate history for 1W change calculation', series: [] },
  month30: { desc: '30-day-ago snapshot for 1M change calculation', series: [] },
  fredFxRates: { desc: 'FRED foreign exchange rate series (EUR, JPY, GBP, CHF, AUD, CAD)', series: ['DEXUSEU', 'DEXJPUS', 'DEXUSUK', 'DEXSZUS', 'DEXALUS', 'DEXCAUS'] },
  reer: { desc: 'Real effective exchange rates from BIS/FRED', series: [] },
  rateDifferentials: { desc: 'Central bank policy rate differentials vs Fed funds', series: [] },
  dxyHistory: { desc: 'Trade-weighted US dollar index (DTWEXBGS)', series: ['DTWEXBGS'] },
  cotHistory: { desc: 'CFTC Commitments of Traders historical positioning', series: [] },
  eia: { desc: 'EIA data: WTI price, natural gas, crude stocks, nat gas storage', series: [] },
  fred: { desc: 'FRED commodity series (gold, silver, copper, WTI, Brent, nat gas)', series: ['GOLDAMGBD228NLBM', 'SLVPRUSD', 'PCOPPUSDM', 'POILWTIUSDM', 'POILBREUSDM', 'PNGASUSUSDM'] },
  yahoo: { desc: 'Yahoo Finance market data (DBC ETF prices, etc.)', series: [] },
  worldBank: { desc: 'World Bank commodity price indices', series: [] },
  coinMarketData: { desc: 'CoinGecko: coin prices, market cap, 24h volume', series: [] },
  fearGreedData: { desc: 'Crypto Fear & Greed index', series: [] },
  defiData: { desc: 'DeFi Llama: total value locked across protocols', series: [] },
  fundingData: { desc: 'Perpetual futures funding rates', series: [] },
  onChainData: { desc: 'On-chain metrics: active addresses, hash rate, exchange flows', series: [] },
  stablecoinMcap: { desc: 'Stablecoin total market capitalization', series: [] },
  btcDominance: { desc: 'BTC market dominance as % of total crypto mcap', series: [] },
  topExchanges: { desc: 'Top crypto exchange volume rankings', series: [] },
  ethGas: { desc: 'Ethereum gas price in Gwei', series: [] },
  spreadData: { desc: 'IG/HY/EM credit spread history from FRED', series: ['BAMLH0A0HYM2', 'BAMLC0A0CM', 'BAMLEMCBPIOAS'] },
  emBondData: { desc: 'Emerging market bond spread data', series: [] },
  loanData: { desc: 'Commercial and consumer loan market data', series: [] },
  defaultData: { desc: 'Corporate and consumer default rates', series: [] },
  delinquencyRates: { desc: 'Consumer loan delinquency rates (FRED)', series: ['DRSFRWBS'] },
  lendingStandards: { desc: 'Senior Loan Officer Opinion Survey (SLOOS)', series: [] },
  commercialPaper: { desc: 'Commercial paper rates from FRED', series: ['CPN3M'] },
  excessReserves: { desc: 'Excess reserves of depository institutions', series: ['EXCSRESNW'] },
  combinedRatioData: { desc: 'Insurance combined ratio by line of business (NAIC)', series: [] },
  reserveAdequacyData: { desc: 'Insurance reserve adequacy by line', series: [] },
  reinsurers: { desc: 'Reinsurance pricing and capacity data', series: [] },
  hyOAS: { desc: 'High yield OAS spread (BAMLH0A0HYM2)', series: ['BAMLH0A0HYM2'] },
  igOAS: { desc: 'Investment grade OAS spread (BAMLC0A0CM)', series: ['BAMLC0A0CM'] },
  catBondSpreads: { desc: 'Catastrophe bond spread data (alias for catBondProxy)', series: [] },
  fredHyOasHistory: { desc: 'HY OAS spread history from FRED', series: ['BAMLH0A0HYM2'] },
  sectorETF: { desc: 'Insurance sector ETF performance (XLF, KIE, etc.)', series: [] },
  catBondProxy: { desc: 'Cat bond proxy / ILS market data', series: [] },
  industryAvgCombinedRatio: { desc: 'Industry average combined ratio', series: [] },
  treasury10y: { desc: '10Y Treasury yield for discounting models', series: ['DGS10'] },
  catLosses: { desc: 'US catastrophe loss data (annual)', series: [] },
  combinedRatioHistory: { desc: 'Historical combined ratio trend', series: [] },
  priceDashboardData: { desc: 'Commodity price dashboard: WTI, Brent, nat gas, gold, silver, copper', series: ['POILWTIUSDM', 'POILBREUSDM', 'PNGASUSUSDM', 'GOLDAMGBD228NLBM', 'SLVPRUSD', 'PCOPPUSDM'] },
  futuresCurveData: { desc: 'Commodity futures curve data from CME/Yahoo', series: [] },
  sectorHeatmapData: { desc: 'Commodity sector heatmap (energy, metals, agriculture)', series: [] },
  supplyDemandData: { desc: 'Commodity supply/demand fundamentals from EIA', series: [] },
  cotData: { desc: 'CFTC Commitments of Traders for commodity futures', series: [] },
  fredCommodities: { desc: 'FRED commodity price series (gold, silver, copper, WTI, Brent, nat gas)', series: ['GOLDAMGBD228NLBM', 'SLVPRUSD', 'PCOPPUSDM', 'POILWTIUSDM', 'POILBREUSDM', 'PNGASUSUSDM'] },
  goldFuturesCurve: { desc: 'Gold futures term structure', series: [] },
  dbcEtf: { desc: 'Invesco DB Commodity Index ETF (DBC)', series: [] },
  vixTermStructure: { desc: 'VIX futures term structure (spot, 1M, 2M, 3M)', series: ['VIXCLS'] },
  vixEnrichment: { desc: 'VIX-derived metrics: VVIX, spot vs 3M spread', series: ['VIXCLS'] },
  optionsFlow: { desc: 'Unusual options activity flow data', series: [] },
  volSurfaceData: { desc: 'Implied volatility surface for SPX', series: [] },
  volPremium: { desc: 'Implied vs realized volatility premium', series: [] },
  fredVixHistory: { desc: 'Historical VIX data from FRED', series: ['VIXCLS'] },
  putCallRatio: { desc: 'CBOE total put/call ratio', series: [] },
  skewIndex: { desc: 'CBOE SKEW index (tail risk)', series: ['SKEW'] },
  skewHistory: { desc: 'Historical SKEW index data', series: ['SKEW'] },
  gammaExposure: { desc: 'Dealer gamma exposure estimate', series: [] },
  vixPercentile: { desc: 'VIX current percentile vs 1Y range', series: ['VIXCLS'] },
  termSpread: { desc: 'VIX futures term spread (M2 - M1)', series: ['VIXCLS'] },
  reitData: { desc: 'REIT performance and fundamentals data', series: [] },
  caseShiller: { desc: 'Case-Shiller National Home Price Index', series: ['CSUSHPISA'] },
  mortgageRates: { desc: '30Y and 15Y fixed mortgage rates from FRED', series: ['MORTGAGE30US', 'MORTGAGE15US'] },
  housingAffordability: { desc: 'Housing affordability index', series: [] },
  homePriceIndex: { desc: 'FHFA/FRED home price index', series: [] },
  supplyData: { desc: 'Housing supply (months of supply, months supply)', series: [] },
  homeownershipRate: { desc: 'US homeownership rate from FRED', series: ['RSAHORUSQ156S'] },
  rentCpi: { desc: 'Rent CPI component (CPIERSL)', series: ['CPIERSL'] },
  reitEtf: { desc: 'Vanguard Real Estate ETF (VNQ)', series: [] },
  existingHomeSales: { desc: 'Existing home sales from FRED', series: ['EXHOSLUSM495S'] },
  rentalVacancy: { desc: 'Rental vacancy rate from FRED', series: ['RRVRUSQ156N'] },
  housingStarts: { desc: 'Housing starts from FRED', series: ['HOUST'] },
  medianHomePrice: { desc: 'US median home price', series: [] },
  capRateData: { desc: 'Implied cap rate by real estate sector', series: [] },
  foreclosureData: { desc: 'Foreclosure activity data', series: [] },
  mbaApplications: { desc: 'MBA mortgage applications index', series: [] },
  creDelinquencies: { desc: 'Commercial real estate delinquency rates', series: [] },
  vixData: { desc: 'VIX index data from FRED', series: ['VIXCLS'] },
  hySpreadData: { desc: 'High yield OAS spread from FRED', series: ['BAMLH0A0HYM2'] },
  igSpreadData: { desc: 'Investment grade OAS spread from FRED', series: ['BAMLC0A0CM'] },
  yieldCurveData: { desc: 'Yield curve shape data (10Y-2Y, 10Y-3M)', series: ['T10Y2Y', 'T10Y3M'] },
  cftcCot: { desc: 'CFTC Commitments of Traders report', series: [] },
  marginDebt: { desc: 'Margin debt (debit balances) from FRED', series: ['ANEDBI'] },
  mutualFundFlows: { desc: 'Mutual fund flow data', series: [] },
  consumerCredit: { desc: 'Total consumer credit outstanding from FRED', series: ['TOTALSL'] },
  vvixData: { desc: 'VVIX (volatility of VIX) data', series: [] },
  financialStressIndex: { desc: 'St. Louis Financial Stress Index', series: ['STLFSI4'] },
  econEvents: { desc: 'Economic calendar events from Econdb', series: [] },
  centralBankRates: { desc: 'Central bank policy rates (Fed, ECB, BOE, BOJ) from FRED', series: ['FEDFUNDS'] },
  earnings: { desc: 'Upcoming earnings dates from Yahoo Finance', series: [] },
  fredReleases: { desc: 'FRED scheduled economic releases', series: [] },
  dividends: { desc: 'Ex-dividend calendar from Yahoo Finance', series: [] },
  worldBankIndicators: { desc: 'World Bank global development indicators', series: [] },
  fredRates: { desc: 'Central bank policy rates from FRED', series: ['FEDFUNDS'] },
  fredRateHistory: { desc: 'Historical central bank policy rate data', series: ['FEDFUNDS'] },
  fredMacroHistory: { desc: 'Historical macro indicators (CPI, GDP, unemployment)', series: ['CPIAUCSL', 'GDP', 'UNRATE'] },
  oecdCli: { desc: 'OECD Composite Leading Indicators', series: [] },
  blsCpi: { desc: 'BLS CPI data by component', series: ['CPIAUCSL', 'CPILFESL'] },
  sectorETFs: { desc: 'Equity sector ETF performance data', series: [] },
  factorStocks: { desc: 'Factor-based equity rankings (value, momentum, quality)', series: [] },
  shortInterest: { desc: 'Market-wide short interest data', series: [] },
  equityRiskPremium: { desc: 'Equity risk premium estimate (Damodaran/FRED)', series: [] },
  spPE: { desc: 'S&P 500 P/E ratio', series: [] },
  breadthDivergence: { desc: 'Market breadth and divergence indicators', series: [] },
  buffettIndicator: { desc: 'Buffett Indicator (total market cap / GDP)', series: ['GFDEBTN'] },
};

function resolveMeta(key) {
  return SOURCE_META[key] || null;
}

function formatUTC(localTs) {
  if (!localTs) return { utc: '\u2014', offset: '' };
  const d = new Date(localTs.replace(' ', 'T'));
  if (isNaN(d.getTime())) return { utc: localTs, offset: '' };
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absH = Math.floor(Math.abs(offsetMin) / 60);
  const absM = Math.abs(offsetMin) % 60;
  const offset = `UTC${sign}${String(absH).padStart(2, '0')}:${String(absM).padStart(2, '0')}`;
  const utc = d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '') + ' UTC';
  return { utc, offset, local: localTs };
}

function fredSeriesUrl(sid) { return `https://fred.stlouisfed.org/series/${sid}`; }

function fredApiUrl(sid) {
  const p = new URLSearchParams({ series_id: sid, file_type: 'json', sort_order: 'desc', limit: '5' });
  return `${FRED_API_BASE}?${p.toString()}`;
}

function isFRED(id) {
  return id && /^[A-Z0-9]{3,15}$/.test(id) && !id.startsWith('/') && !id.startsWith('HTTP');
}

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  const doCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => { setC(true); setTimeout(() => setC(false), 1500); });
  };
  return <button className="df-copy-btn" onClick={doCopy}>{c ? 'Copied' : 'Copy'}</button>;
}

function SeriesRow({ sid }) {
  return (
    <div className="df-series-item">
      <span className="df-series-id">{sid}</span>
      <div className="df-series-right">
        {isFRED(sid) ? (
          <>
            <span className="df-series-src">FRED</span>
            <a href={fredSeriesUrl(sid)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="df-series-link">Series Page</a>
            <a href={fredApiUrl(sid)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="df-series-link">Fetch JSON</a>
          </>
        ) : (
          <span className="df-series-src">Non-FRED</span>
        )}
      </div>
    </div>
  );
}

function SourceBlock({ name, received, meta }) {
  return (
    <div className={`df-source-block ${received ? 'df-sb-ok' : 'df-sb-miss'}`}>
      <div className="df-sb-head">
        <span className="df-sb-name">{name}</span>
        <span className="df-sb-badge">{received ? '\u2713 Received' : '\u2717 Missing'}</span>
      </div>
      <div className="df-sb-desc">{meta?.desc || (received ? 'Data received' : 'No data \u2014 source may be unavailable or rate-limited')}</div>
      {meta?.series && meta.series.length > 0 && (
        <div className="df-sb-series">
          {meta.series.map(sid => <SeriesRow key={sid} sid={sid} />)}
        </div>
      )}
      {(!meta?.series || meta.series.length === 0) && (
        <div className="df-sb-nofred">{received ? 'Non-FRED source \u2014 verify at the endpoint URL' : 'No FRED series \u2014 check the endpoint URL for raw output'}</div>
      )}
    </div>
  );
}

function EntryDetail({ entry }) {
  const { utc, offset } = formatUTC(entry.time);
  const url = entry.url || '';
  const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;

  return (
    <div className="df-detail">
      <div className="df-detail-row"><span className="df-dl">Timestamp</span><span className="df-dv">{entry.time} <span className="df-tz">{offset}</span></span></div>
      <div className="df-detail-row"><span className="df-dl"></span><span className="df-dv-sub">{utc}</span></div>
      <div className="df-detail-row"><span className="df-dl">Endpoint</span><span className="df-dv df-url-row"><a className="df-url-link" href={fullUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{fullUrl}</a><CopyBtn text={fullUrl} /></span></div>
      <div className="df-detail-row"><span className="df-dl">Status</span><span className="df-dv">{entry.error ? <span className="df-err">Error: {entry.error}</span> : <span className="df-ok">{entry.status} in {entry.duration}</span>}</span></div>

      {entry.sources && Object.keys(entry.sources).length > 0 && (
        <div className="df-detail-sources">
          {Object.entries(entry.sources).map(([key, received]) => (
            <SourceBlock key={key} name={key} received={received} meta={resolveMeta(key)} />
          ))}
        </div>
      )}

      {entry.seriesIds && entry.seriesIds.length > 0 && (!entry.sources || Object.keys(entry.sources).length === 0) && (
        <div className="df-detail-seriesonly">
          <div className="df-dl">Series</div>
          {entry.seriesIds.map(sid => <SeriesRow key={sid} sid={sid} />)}
        </div>
      )}

      <div className="df-verify">
        <span className="df-dl">Verify</span>
        <span className="df-dv-muted">Click the endpoint URL above to see raw API output. For FRED series, click "Fetch JSON" to open a pre-authenticated query and compare values.</span>
      </div>
    </div>
  );
}

function SourceExpand({ sourceKey, received }) {
  const meta = resolveMeta(sourceKey);
  return (
    <div className="df-detail">
      <div className="df-detail-row"><span className="df-dl">Source</span><span className="df-dv" style={{ color: received ? '#4ade80' : '#f87171' }}>{sourceKey}</span></div>
      <div className="df-detail-row"><span className="df-dl">Status</span><span className="df-dv">{received ? <span className="df-ok">Received</span> : <span className="df-err">Missing</span>}</span></div>
      <div className="df-sb-desc">{meta?.desc || (received ? 'Data received from this source' : 'No data \u2014 may be unavailable or rate-limited')}</div>
      {meta?.series && meta.series.length > 0 && (
        <div className="df-sb-series" style={{ marginTop: 4 }}>
          {meta.series.map(sid => <SeriesRow key={sid} sid={sid} />)}
        </div>
      )}
      {(!meta?.series || meta.series.length === 0) && (
        <div className="df-sb-nofred" style={{ marginTop: 4 }}>{received ? 'Non-FRED source \u2014 open the endpoint URL above to verify raw data' : 'No FRED series available \u2014 try the endpoint URL directly'}</div>
      )}
      <div className="df-verify" style={{ marginTop: 4 }}>
        <span className="df-dl">Verify</span>
        <span className="df-dv-muted">{received
          ? 'Click "Fetch JSON" on any FRED series above to open the API query and confirm values match the app.'
          : 'Source returned no data. Try the endpoint URL \u2014 the API may be rate-limited or the key may be invalid.'}</span>
      </div>
    </div>
  );
}

export default function DataFooter({ source, timestamp, isLive, fetchLog, error, fetchedOn, isCurrent }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState(null);
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [expandedSource, setExpandedSource] = useState(null);
  const rootRef = useRef(null);
  const popoverRef = useRef(null);
  const [measured, setMeasured] = useState(false);

  const open = useCallback(() => {
    if (!fetchLog || fetchLog.length === 0) return;
    const rect = rootRef.current.getBoundingClientRect();
    const pw = Math.min(Math.max(rect.width, 480), 600);
    const vw = window.innerWidth;
    const left = Math.max(8, Math.min(rect.left, vw - pw - 8));
    setPos({ below: rect.bottom + 4, above: rect.top - 4, left, width: pw });
    setShow(true);
    setMeasured(false);
    setExpandedEntry(null);
    setExpandedSource(null);
  }, [fetchLog]);

  const close = useCallback(() => { setShow(false); setExpandedEntry(null); setExpandedSource(null); }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (show) close(); else open();
  }, [show, open, close]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const onClickOutside = (e) => {
      if (popoverRef.current?.contains(e.target)) return;
      if (rootRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClickOutside, true);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClickOutside, true); };
  }, [show, close]);

  useEffect(() => {
    if (!show || !pos || !popoverRef.current || measured) return;
    const el = popoverRef.current;
    const pH = el.offsetHeight;
    const vh = window.innerHeight;
    let top;
    if (pos.below + pH <= vh - 8) top = pos.below;
    else if (pos.above - pH >= 8) top = pos.above - pH;
    else top = Math.max(8, vh - pH - 8);
    el.style.top = `${top}px`;
    setMeasured(true);
  }, [show, pos, measured]);

  const toggleEntry = (i) => { setExpandedEntry(expandedEntry === i ? null : i); setExpandedSource(null); };
  const toggleSource = (k) => { setExpandedSource(expandedSource === k ? null : k); setExpandedEntry(null); };

  const badge = isLive
    ? <span className="df-fetched">FETCHED</span>
    : (fetchLog?.length > 0 ? <span className="df-static">NO DATA</span> : <span className="df-pending">PENDING</span>);

  const sources = fetchLog?.[0]?.sources;

  return (
    <>
      <div className="df-root" ref={rootRef} onClick={handleClick}>
        {badge}
        <span className="df-label">{source}{timestamp ? ` \u00b7 ${timestamp}` : ''}</span>
        {!isLive && error && <span className="df-error-text">\u25cb {error}</span>}
        {isCurrent === false && fetchedOn && <span className="df-stale">Stale \u00b7 fetched {fetchedOn}</span>}
      </div>
      {show && pos && fetchLog?.length > 0 && createPortal(
        <div
          ref={popoverRef}
          className="df-popover"
          style={{ left: pos.left, width: pos.width }}
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          <div className="df-popover-header">
            <div className="df-popover-title">API Call History</div>
            <button className="df-close" onClick={close} aria-label="Close">\u2715</button>
          </div>
          <div className="df-entries">
            {fetchLog.map((entry, i) => (
              <div key={i} className={`df-entry ${entry.error ? 'df-entry-err' : i === 0 ? 'df-entry-latest' : ''} ${expandedEntry === i ? 'df-entry-open' : ''}`}>
                <div className="df-entry-row" onClick={() => toggleEntry(i)}>
                  <span className="df-entry-time">{entry.time}</span>
                  <span className="df-entry-url">{entry.url ? entry.url.replace(/^https?:\/\/[^/]+/, '') : '\u2014'}</span>
                  <span className="df-entry-status">{entry.error ? 'Err' : entry.status}</span>
                  <span className="df-entry-dur">{entry.duration}</span>
                </div>
                {expandedEntry === i && <EntryDetail entry={entry} />}
              </div>
            ))}
          </div>

          {sources && Object.keys(sources).length > 0 && (
            <>
              <div className="df-popover-title" style={{ marginTop: 10 }}>Data Sources Received</div>
              <div className="df-sources">
                {Object.entries(sources).map(([key, received]) => (
                  <div key={key} className={`df-source ${received ? 'df-src-ok' : 'df-src-miss'} ${expandedSource === key ? 'df-src-open' : ''}`}>
                    <div className="df-source-row" onClick={() => toggleSource(key)}>
                      <span className="df-source-name">{key}</span>
                      <span className="df-source-badge">{received ? '\u2713' : '\u2717'}</span>
                    </div>
                    {expandedSource === key && <SourceExpand sourceKey={key} received={received} />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}