import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useCurrency } from '../../../hub/CurrencyContext';
import BentoWrapper from '../../../components/BentoWrapper';
import GlobalKpiStrip from './GlobalKpiStrip';
import CountryDetailPanel from './CountryDetailPanel';
import DataFooter from '../../../components/DataFooter/DataFooter';
import MetricValue from '../../../components/MetricValue/MetricValue';
// Merged-in panels from former IMF + World Bank tabs.
import ImfReserves from '../../imf/ImfReserves';
import ImfCofier from '../../imf/ImfCofier';
import WbDevScatter from '../../worldbank/WbDevScatter';
import WbTradeOpenness from '../../worldbank/WbTradeOpenness';
import './GlobalMacroDashboard.css';

const stopDrag = (e) => e.stopPropagation();

function GdpBars({ data, lastUpdated }) {
  if (!data?.length) return null;
  const maxGdp = Math.max(...data.map(c => Math.abs(c.gdp ?? 0)));
  return (
    <div className="mac-mini-bars">
      {data.slice(0, 8).map(c => (
        <div key={c.code} className="mac-mini-bar-row">
          <span className="mac-mini-label">{c.flag}</span>
          <div className="mac-mini-bar-track">
            <div className="mac-mini-bar-fill" style={{ width: `${((c.gdp ?? 0) / maxGdp) * 100}%`, background: c.gdp >= 0 ? '#14b8a6' : '#ef4444' }} />
          </div>
          <span className="mac-mini-value"><MetricValue value={c.gdp} seriesKey="gdp" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} /></span>
        </div>
      ))}
    </div>
  );
}

function CpiBars({ data, lastUpdated }) {
  if (!data?.length) return null;
  const maxCpi = Math.max(...data.map(c => c.cpi ?? 0));
  return (
    <div className="mac-mini-bars">
      {data.slice(0, 8).map(c => (
        <div key={c.code} className="mac-mini-bar-row">
          <span className="mac-mini-label">{c.flag}</span>
          <div className="mac-mini-bar-track">
            <div className="mac-mini-bar-fill" style={{ width: `${((c.cpi ?? 0) / maxCpi) * 100}%`, background: c.cpi <= 2 ? '#4ade80' : c.cpi <= 4 ? '#fbbf24' : '#f87171' }} />
          </div>
          <span className="mac-mini-value"><MetricValue value={c.cpi} seriesKey="cpiBreakdown" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} /></span>
        </div>
      ))}
    </div>
  );
}

function RateBars({ data, lastUpdated }) {
  if (!data?.current?.length) return null;
  const sorted = [...data.current].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  const maxRate = Math.max(...sorted.map(c => c.rate ?? 0));
  return (
    <div className="mac-mini-bars">
      {sorted.slice(0, 8).map(c => (
        <div key={c.code} className="mac-mini-bar-row">
          <span className="mac-mini-label">{c.flag}</span>
          <div className="mac-mini-bar-track">
            <div className="mac-mini-bar-fill" style={{ width: `${((c.rate ?? 0) / maxRate) * 100}%`, background: c.rate <= 3 ? '#4ade80' : c.rate <= 6 ? '#fbbf24' : '#f87171' }} />
          </div>
          <span className="mac-mini-value"><MetricValue value={c.rate} seriesKey="fedRate" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}%` : '—'} /></span>
        </div>
      ))}
    </div>
  );
}

function DebtBars({ data, lastUpdated, convertAndFormat }) {
  if (!data?.countries?.length) return null;
  const sorted = [...data.countries].sort((a, b) => (b.debt ?? 0) - (a.debt ?? 0));
  const maxDebt = Math.max(...sorted.map(c => c.debt ?? 0));
  return (
    <div className="mac-mini-bars">
      {sorted.slice(0, 8).map(c => (
        <div key={c.code} className="mac-mini-bar-row">
          <span className="mac-mini-label">{c.flag}</span>
          <div className="mac-mini-bar-track">
            <div className="mac-mini-bar-fill" style={{ width: `${((c.debt ?? 0) / maxDebt) * 100}%`, background: c.debt <= 60 ? '#4ade80' : c.debt <= 90 ? '#fbbf24' : '#f87171' }} />
          </div>
          <span className="mac-mini-value"><MetricValue value={c.debt} seriesKey="debtToGdp" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(0)}%` : '—'} /></span>
        </div>
      ))}
    </div>
  );
}

// KPI strip is now a real bento child at row 0 (h:2). Other panels shifted
// down by 2 rows. IMF + World Bank panels are merged in below at y=14+.
const LAYOUT = {
  lg: [
    { i: 'kpi',       x: 0, y: 0,  w: 12, h: 2 },
    { i: 'sidebar',   x: 8, y: 2,  w: 4,  h: 5 },
    { i: 'scorecard', x: 0, y: 2,  w: 8,  h: 3 },
    { i: 'gdp',       x: 0, y: 5,  w: 4,  h: 3 },
    { i: 'cpi',       x: 4, y: 5,  w: 4,  h: 3 },
    { i: 'rates',     x: 0, y: 8,  w: 4,  h: 3 },
    { i: 'debt',      x: 4, y: 8,  w: 4,  h: 3 },
    { i: 'cxstrength',x: 8, y: 7,  w: 4,  h: 3 },
    { i: 'activity',  x: 0, y: 11, w: 6,  h: 3 },
    { i: 'cli',       x: 6, y: 11, w: 6,  h: 3 },
    // IMF + WB merged panels — conditionally rendered when those endpoints
    // return data; layout entries are present so RGL has positions ready.
    { i: 'imf-reserves', x: 0, y: 14, w: 6,  h: 4 },
    { i: 'imf-cofer',    x: 6, y: 14, w: 6,  h: 4 },
    { i: 'wb-trade',     x: 0, y: 18, w: 6,  h: 4 },
    { i: 'wb-dev',       x: 6, y: 18, w: 6,  h: 4 },
  ]
};

function GlobalMacroDashboard({
  kpiSidebar,
  scorecardData, growthInflationData, centralBankData, debtData,
  m2Growth, tradeBalance, industrialProd, consumerSentiment, yieldSpread, cfnai, oecdCli, cpiBreakdown,
  imfData, wbData,
  fetchLog, isLive, lastUpdated, error, fetchedOn, isCurrent,
}) {
  const { colors } = useTheme();
  const { convertAndFormat, currentSymbol } = useCurrency();
  const [selectedCountry, setSelectedCountry] = useState(null);

  const sortedByGdp = useMemo(() => {
    if (!scorecardData) return [];
    return [...scorecardData].sort((a, b) => (b.gdp ?? -999) - (a.gdp ?? -999));
  }, [scorecardData]);

  const sortedByCpi = useMemo(() => {
    if (!scorecardData) return [];
    return [...scorecardData].sort((a, b) => (a.cpi ?? 999) - (b.cpi ?? 999));
  }, [scorecardData]);

  const gdpHeat = (v) => { if (v == null) return 'mac-heat-neu'; if (v >= 3) return 'mac-heat-dg'; if (v >= 1) return 'mac-heat-lg'; if (v >= 0) return 'mac-heat-neu'; return 'mac-heat-dr'; };
  const cpiHeat = (v) => { if (v == null) return 'mac-heat-neu'; if (v <= 2) return 'mac-heat-dg'; if (v <= 4) return 'mac-heat-lg'; if (v <= 6) return 'mac-heat-lr'; return 'mac-heat-dr'; };
  const rateHeat = (v) => { if (v == null) return 'mac-heat-neu'; if (v <= 3) return 'mac-heat-dg'; if (v <= 6) return 'mac-heat-lg'; return 'mac-heat-lr'; };
  const unempHeat = (v) => { if (v == null) return 'mac-heat-neu'; if (v <= 4) return 'mac-heat-dg'; if (v <= 6) return 'mac-heat-lg'; if (v <= 8) return 'mac-heat-lr'; return 'mac-heat-dr'; };
  const debtHeat = (v) => { if (v == null) return 'mac-heat-neu'; if (v <= 60) return 'mac-heat-dg'; if (v <= 90) return 'mac-heat-lg'; if (v <= 120) return 'mac-heat-lr'; return 'mac-heat-dr'; };

  const cfnaiStatus = useMemo(() => {
    const v = cfnai?.latest ?? cfnai?.values?.[cfnai.values?.length - 1];
    if (v == null) return { label: '—', color: colors.textMuted };
    if (v < -0.7) return { label: 'Recession', color: '#ef4444' };
    if (v < -0.3) return { label: 'Contraction', color: '#f87171' };
    if (v < 0) return { label: 'Below Trend', color: '#fbbf24' };
    if (v < 0.3) return { label: 'Near Trend', color: '#a3e635' };
    return { label: 'Above Trend', color: '#4ade80' };
  }, [cfnai, colors.textMuted]);

  if (!scorecardData?.length) return null;

  return (
    <div className="mac-dashboard mac-dashboard--bento">
      {/* GlobalKpiStrip is rendered in GlobalMacroMarket above this component to avoid duplication */}

      <BentoWrapper layout={LAYOUT} storageKey="macro-layout-v3">
        {/* KPI strip — real bento child rendered at row 0. The strip body
            is provided by the parent (GlobalMacroKpiStrip) so it can wire
            up the right data and seriesKeys. */}
        {kpiSidebar && (
          <div key="kpi" className="mac-bento-card">
            <div className="mac-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Macro Key Metrics</span>
            </div>
            <div className="bento-panel-content mac-panel-scroll">
              {kpiSidebar}
            </div>
          </div>
        )}

        {/* Sidebar — Quick Indicators */}
        <div key="sidebar" className="mac-bento-card">
          <div className="mac-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Quick Indicators</span>
          </div>
          <div className="bento-panel-content mac-panel-scroll" onMouseDown={stopDrag}>
      <div className="mac-sidebar-section">
        <div className="mac-sidebar-title">GDP Growth</div>
        <GdpBars data={sortedByGdp} lastUpdated={lastUpdated} />
      </div>
      <div className="mac-sidebar-section">
        <div className="mac-sidebar-title">Inflation</div>
        <CpiBars data={sortedByCpi} lastUpdated={lastUpdated} />
      </div>
      <div className="mac-sidebar-section">
        <div className="mac-sidebar-title">CB Rates</div>
        <RateBars data={centralBankData} lastUpdated={lastUpdated} />
      </div>
      <div className="mac-sidebar-section" style={{ borderBottom: 'none' }}>
        <div className="mac-sidebar-title">Debt/GDP</div>
              <DebtBars data={debtData} lastUpdated={lastUpdated} convertAndFormat={convertAndFormat} currentSymbol={currentSymbol} />
      </div>

          </div>
          <DataFooter source="World Bank / FRED / BIS" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* Scorecard */}
          <div key="scorecard" className="mac-bento-card">
            <div className="mac-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Country Scorecard</span>
              <span className="bento-panel-subtitle">Click row for details</span>
            </div>
            <div className="bento-panel-content mac-panel-scroll" onMouseDown={stopDrag}>
              <div className="mac-scorecard-compact" style={{ background: colors.bgCard }}>
                <div className="mac-scorecard-header-row">
                  <div className="mac-scorecell mac-scorecell-flag"></div>
                  <div className="mac-scorecell mac-scorecell-country">Country</div>
                  <div className="mac-scorecell">GDP</div>
                  <div className="mac-scorecell">CPI</div>
                  <div className="mac-scorecell">Rate</div>
                  <div className="mac-scorecell">Unemp</div>
                  <div className="mac-scorecell">Debt</div>
                </div>
                {scorecardData.map(country => (
                  <div
                    key={country.code}
                    className={`mac-scorecard-row ${selectedCountry?.code === country.code ? 'selected' : ''}`}
                    onClick={() => setSelectedCountry(country)}
                    style={{ background: selectedCountry?.code === country.code ? 'rgba(20, 184, 166, 0.1)' : 'transparent' }}
                  >
                    <div className="mac-scorecell mac-scorecell-flag">{country.flag}</div>
                    <div className="mac-scorecell mac-scorecell-country">{country.code}</div>
                    <div className={`mac-scorecell ${gdpHeat(country.gdp)}`}><MetricValue value={country.gdp} seriesKey="gdp" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} /></div>
                    <div className={`mac-scorecell ${cpiHeat(country.cpi)}`}><MetricValue value={country.cpi} seriesKey="cpiBreakdown" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} /></div>
                    <div className={`mac-scorecell ${rateHeat(country.rate)}`}><MetricValue value={country.rate} seriesKey="fedRate" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}%` : '—'} /></div>
                    <div className={`mac-scorecell ${unempHeat(country.unemp)}`}><MetricValue value={country.unemp} seriesKey="unemployment" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} /></div>
                    <div className={`mac-scorecell ${debtHeat(country.debt)}`}><MetricValue value={country.debt} seriesKey="debtToGdp" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(0)}%` : '—'} /></div>
                  </div>
                ))}
              </div>
            </div>
            <DataFooter source="World Bank / FRED / BIS" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

          {/* GDP Growth */}
          <div key="gdp" className="mac-bento-card">
            <div className="mac-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">GDP Growth</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <GdpBars data={sortedByGdp} lastUpdated={lastUpdated} />
            </div>
            <DataFooter source="World Bank / FRED / BIS" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

          {/* CPI Inflation */}
          <div key="cpi" className="mac-bento-card">
            <div className="mac-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">CPI Inflation</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <CpiBars data={sortedByCpi} lastUpdated={lastUpdated} />
            </div>
            <DataFooter source="FRED" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

          {/* Policy Rates */}
          <div key="rates" className="mac-bento-card">
            <div className="mac-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Policy Rates</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <RateBars data={centralBankData} lastUpdated={lastUpdated} />
            </div>
            <DataFooter source="FRED / BIS" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

          {/* Debt / GDP */}
          <div key="debt" className="mac-bento-card">
            <div className="mac-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Debt / GDP</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
        <DebtBars data={debtData} lastUpdated={lastUpdated} convertAndFormat={convertAndFormat} currentSymbol={currentSymbol} />
            </div>
            <DataFooter source="World Bank / FRED / BIS" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

          {/* Economic Activity */}
          <div key="activity" className="mac-bento-card">
            <div className="mac-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Economic Activity</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <div className="mac-activity-summary">
                <div className="mac-activity-metric">
                  <span className="mac-activity-label">CFNAI</span>
                  <span className="mac-activity-value" style={{ color: cfnaiStatus.color }}><MetricValue value={cfnai?.latest} seriesKey="cfnai" timestamp={lastUpdated} format={v => v != null ? v.toFixed(2) : '—'} /></span>
                  <span className="mac-activity-status">{cfnaiStatus.label}</span>
                </div>
                {yieldSpread?.values?.length > 0 && (
                  <div className="mac-activity-metric">
                    <span className="mac-activity-label">10Y-2Y Spread</span>
                    <span className="mac-activity-value" style={{ color: yieldSpread.values[yieldSpread.values.length - 1] < 0 ? '#ef4444' : '#4ade80' }}>
                      <MetricValue value={yieldSpread.values[yieldSpread.values.length - 1]} seriesKey="t10y2y" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}%` : '—'} />
                    </span>
                  </div>
                )}
              </div>
            </div>
            <DataFooter source="FRED / BIS" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

          {/* OECD CLI — server returns map { US: {value, date}, ... }.
              Render whatever country codes are present (flags pulled from
              the macro scorecard for consistency). */}
          <div key="cli" className="mac-bento-card">
            <div className="mac-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">OECD Leading Indicators</span>
              <span className="mac-panel-subtitle">Amplitude-adjusted CLI · 100 = trend</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <div className="mac-cli-mini-grid">
                {oecdCli && Object.entries(oecdCli).map(([code, entry]) => {
                  const meta = scorecardData?.find(sc => sc.code === code);
                  const v = entry?.value;
                  return (
                    <div key={code} className="mac-cli-mini-card">
                      <span className="mac-cli-mini-flag">{meta?.flag || code}</span>
                      <span className="mac-cli-mini-value" style={{ color: v > 100 ? '#4ade80' : v != null ? '#f87171' : '#94a3b8' }}>
                        <MetricValue value={v} seriesKey="oecdCli" timestamp={entry?.date || lastUpdated} format={x => x != null ? `${x.toFixed(1)}` : '—'} />
                      </span>
                      <span className="mac-cli-mini-trend" style={{ color: v > 100 ? '#4ade80' : v < 99 ? '#f87171' : '#fbbf24' }}>
                        {v > 100 ? '↗' : v < 99 ? '↘' : '→'}
                      </span>
                    </div>
                  );
                })}
                {(!oecdCli || Object.keys(oecdCli).length === 0) && (
                  <div className="mac-empty">No CLI data available — FRED OECD series unavailable</div>
                )}
              </div>
            </div>
            <DataFooter source="FRED OECD CLI" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

          {/* IMF — International Reserves (merged from former IMF tab) */}
          {imfData?.countries?.length > 0 && (
            <div key="imf-reserves" className="mac-bento-card">
              <div className="mac-panel-title-row bento-panel-title-row">
                <span className="bento-panel-title">International Reserves</span>
                <span className="mac-panel-subtitle">Central-bank FX reserves · USD billions · IMF IFS</span>
              </div>
              <div className="bento-panel-content" onMouseDown={stopDrag}>
                <ImfReserves countries={imfData.countries} ifsReserves={imfData.ifsReserves} lastUpdated={lastUpdated} />
              </div>
              <DataFooter source="IMF IFS (RAXFSFX)" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
            </div>
          )}

          {/* IMF — COFER currency-share donut (merged from former IMF tab) */}
          {imfData?.cofer && Object.keys(imfData.cofer).length > 0 && (
            <div key="imf-cofer" className="mac-bento-card">
              <div className="mac-panel-title-row bento-panel-title-row">
                <span className="bento-panel-title">COFER Currency Shares</span>
                <span className="mac-panel-subtitle">Global FX reserves by currency · IMF COFER · quarterly</span>
              </div>
              <div className="bento-panel-content" onMouseDown={stopDrag}>
                <ImfCofier cofer={imfData.cofer} lastUpdated={lastUpdated} />
              </div>
              <DataFooter source="IMF COFER" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
            </div>
          )}

          {/* World Bank — Trade Openness (merged from former WB tab) */}
          {wbData?.countries?.length > 0 && (
            <div key="wb-trade" className="mac-bento-card">
              <div className="mac-panel-title-row bento-panel-title-row">
                <span className="bento-panel-title">Trade Openness</span>
                <span className="mac-panel-subtitle">(Exports + Imports) / GDP · World Bank WDI</span>
              </div>
              <div className="bento-panel-content" onMouseDown={stopDrag}>
                <WbTradeOpenness countries={wbData.countries} lastUpdated={lastUpdated} />
              </div>
              <DataFooter source="World Bank WDI" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
            </div>
          )}

          {/* World Bank — GDP per Capita vs Growth scatter */}
          {wbData?.countries?.length > 0 && (
            <div key="wb-dev" className="mac-bento-card">
              <div className="mac-panel-title-row bento-panel-title-row">
                <span className="bento-panel-title">GDP per Capita vs Growth</span>
                <span className="mac-panel-subtitle">Bubble = population · World Bank WDI</span>
              </div>
              <div className="bento-panel-content" onMouseDown={stopDrag}>
                <WbDevScatter countries={wbData.countries} lastUpdated={lastUpdated} />
              </div>
              <DataFooter source="World Bank WDI" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
            </div>
          )}
        </BentoWrapper>

        {selectedCountry && (
          <CountryDetailPanel
            country={selectedCountry}
            onClose={() => setSelectedCountry(null)}
            centralBankData={centralBankData}
            oecdCli={oecdCli}
            scorecardData={scorecardData}
            convertAndFormat={convertAndFormat}
            currentSymbol={currentSymbol}
          />
        )}
    </div>
  );
}

export default React.memo(GlobalMacroDashboard);