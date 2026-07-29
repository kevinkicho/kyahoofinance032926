import React from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './GlobalMacroDashboard.css';

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

export { GdpBars, CpiBars, RateBars, DebtBars };
