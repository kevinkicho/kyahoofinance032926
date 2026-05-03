import React, { useState, useMemo } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import { useMarketData } from '../../hub/DataContext';
import DetailPanel from '../DetailPanel/DetailPanel';
import { exchangeRates } from '../../utils/constants';
import './Sidebar.css';

const KpiStrip = ({ metrics, accentColor }) => (
  <div className="kpi-strip" style={{ borderTop: `3px solid ${accentColor}`, marginTop: '20px' }}>
    <div className="kpi-grid">
      {metrics.map((m, i) => (
        <div key={i} className="kpi-item">
          <span className="kpi-label">{m.label}</span>
          <span className="kpi-value" style={{ color: accentColor }}>
            {m.prefix}{typeof m.value === 'number' ? m.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}{m.unit}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const MarketSidebarPanel = ({ title, metrics, isLive, note }) => {


  return (
    <>
      <h2>{title} {isLive ? <span className="live-pill">LIVE</span> : ''}</h2>
      <div className="macro-grid">
        {metrics.map((m, i) => (
          <div key={i} className="macro-card">
            <span className="label">{m.label}</span>
            <span className="value">{m.prefix}{typeof m.value === 'number' ? m.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}{m.unit}</span>
            <span className={`trend ${m.change >= 0 ? 'text-green' : 'text-red'}`}>
              {m.change >= 0 ? '↑' : '↓'} {Math.abs(m.change).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
      {note && <p className="credit-note">{note}</p>}
    </>
  );
};

const Sidebar = ({
  selectedTicker,
  setSelectedTicker,
  flatData,
  currentRate,
  currentSymbol,
  currency,
  rates,
  ratesIsLive,
  ratesDate,
  marketStats,
}) => {
  const { colors } = useTheme();
  const fxRates = rates || exchangeRates;
  const bonds = useMarketData('bonds');
  const credit = useMarketData('credit');

  const bondMetrics = [
    { label: "M1 MONEY SUPPLY", value: bonds.M1?.latest, change: bonds.M1 ? ((bonds.M1.latest - bonds.M1.prev) / Math.abs(bonds.M1.prev)) * 100 : 0, prefix: "$", unit: "B" },
    { label: "M2 MONEY SUPPLY", value: bonds.M2?.latest, change: bonds.M2 ? ((bonds.M2.latest - bonds.M2.prev) / Math.abs(bonds.M2.prev)) * 100 : 0, prefix: "$", unit: "B" },
    { label: "CPI (ALL URBAN)", value: bonds.CPI?.latest, change: bonds.CPI ? ((bonds.CPI.latest - bonds.CPI.prev) / Math.abs(bonds.CPI.prev)) * 100 : 0 },
    { label: "FED FUNDS RATE", value: bonds.FFR?.latest, change: bonds.FFR ? ((bonds.FFR.latest - bonds.FFR.prev) / Math.abs(bonds.FFR.prev)) * 100 : 0, unit: "%" },
    { label: "UNEMPLOYMENT", value: bonds.UNEMP?.latest, change: bonds.UNEMP ? ((bonds.UNEMP.latest - bonds.UNEMP.prev) / Math.abs(bonds.UNEMP.prev)) * 100 : 0, unit: "%" },
    { label: "NOMINAL GDP", value: bonds.GDP?.latest, change: bonds.GDP ? ((bonds.GDP.latest - bonds.GDP.prev) / Math.abs(bonds.GDP.prev)) * 100 : 0, prefix: "$", unit: "B" },
  ];

  const creditMetrics = [];
  if (credit.IG_OAS) creditMetrics.push({ label: "IG OAS (bps)", value: credit.IG_OAS.latest, change: ((credit.IG_OAS.latest - credit.IG_OAS.prev) / Math.abs(credit.IG_OAS.prev)) * 100 });
  if (credit.HY_OAS) creditMetrics.push({ label: "HY OAS (bps)", value: credit.HY_OAS.latest, change: ((credit.HY_OAS.latest - credit.HY_OAS.prev) / Math.abs(credit.HY_OAS.prev)) * 100 });
  if (credit.BAA_SPREAD) creditMetrics.push({ label: "Baa–10yr Sprd (%)", value: credit.BAA_SPREAD.latest, change: ((credit.BAA_SPREAD.latest - credit.BAA_SPREAD.prev) / Math.abs(credit.BAA_SPREAD.prev)) * 100 });

  return (
    <aside className="sidebar">
      {selectedTicker ? (
        <DetailPanel
          selectedTicker={selectedTicker}
          setSelectedTicker={setSelectedTicker}
          currentRate={currentRate}
          currentSymbol={currentSymbol}
        />
      ) : (
        <>
          <h2>Market Summary</h2>
          <KpiStrip 
            metrics={[
              { label: "Global Validated Cap", value: (flatData.reduce((acc, curr) => acc + (curr.adjustedValue || curr.value), 0) * currentRate), prefix: currentSymbol, unit: " B" },
              { label: "Equities Tracked", value: flatData.length, prefix: "", unit: "" }
            ]} 
            accentColor="var(--accent-blue)" 
          />
          {marketStats && (
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <div className="stat-card">
                <h3 style={{ fontSize: 11, color: 'var(--text-muted)' }}>Advancers / Decliners</h3>
                <p className="stat-value">
                  <span style={{ color: '#4ade80' }}>{marketStats.advancers}</span>
                  {' / '}
                  <span style={{ color: '#f87171' }}>{marketStats.decliners}</span>
                  {marketStats.unchanged > 0 && <span style={{ color: '#94a3b8' }}> · {marketStats.unchanged}</span>}
                </p>
              </div>
              <div className="stat-card">
                <h3 style={{ fontSize: 11, color: 'var(--text-muted)' }}>52-Week Highs / Lows</h3>
                <p className="stat-value">
                  <span style={{ color: '#4ade80' }}>{marketStats.newHighs}</span>
                  {' / '}
                  <span style={{ color: '#f87171' }}>{marketStats.newLows}</span>
                </p>
              </div>
            </div>
          )}
          <MarketSidebarPanel 
            title="Macro Indicators" 
            metrics={bondMetrics} 
            isLive={bonds.isLive} 
          />
          {creditMetrics.length > 0 && (
            <MarketSidebarPanel 
              title="Credit Spreads" 
              metrics={creditMetrics} 
              isLive={credit.isLive} 
              note={`ICE BofA OAS · Baa–10yr Treasury spread · FRED${credit.IG_OAS?.date ? ` · ${credit.IG_OAS.date}` : ''}`}
            />
          )}
          <h2>
            FX Rates (vs USD)
            {ratesIsLive
              ? <span className="fx-live">● Live {ratesDate}</span>
              : <span className="fx-static">● Static fallback</span>
            }
          </h2>
          <div className="fx-grid">
            {Object.entries(fxRates)
              .filter(([k]) => k !== 'USD')
              .sort(([k1], [k2]) => k1.localeCompare(k2))
              .map(([cur, rate]) => (
                <div key={cur} className="fx-card">
                  <strong>{cur}</strong>
                  <span>{rate.toFixed(cur === 'JPY' || cur === 'KRW' || cur === 'IDR' ? 0 : 2)}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </aside>
  );

};

export default Sidebar;