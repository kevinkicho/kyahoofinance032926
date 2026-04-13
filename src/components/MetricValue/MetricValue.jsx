import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './MetricValue.css';

const FRED_BASE = 'https://fred.stlouisfed.org/series';
const FRED_API_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_API_KEY = import.meta.env.VITE_FRED_API_KEY || '';

function formatTimestampUTC(ts) {
  if (!ts) return null;
  const d = new Date(ts.replace ? ts.replace(' ', 'T') : ts);
  if (isNaN(d.getTime())) return ts;
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absH = Math.floor(Math.abs(offsetMin) / 60);
  const absM = Math.abs(offsetMin) % 60;
  const tz = `UTC${sign}${String(absH).padStart(2, '0')}:${String(absM).padStart(2, '0')}`;
  const utc = d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '') + ' UTC';
  return { utc, tz, local: ts };
}

const SERIES_MAP = {
  '3m': { id: 'DGS3MO', source: 'FRED', name: '3-Month Treasury Bill' },
  '6m': { id: 'DGS6MO', source: 'FRED', name: '6-Month Treasury Bill' },
  '1y': { id: 'DGS1', source: 'FRED', name: '1-Year Treasury' },
  '2y': { id: 'DGS2', source: 'FRED', name: '2-Year Treasury' },
  '5y': { id: 'DGS5', source: 'FRED', name: '5-Year Treasury' },
  '7y': { id: 'DGS7', source: 'FRED', name: '7-Year Treasury' },
  '10y': { id: 'DGS10', source: 'FRED', name: '10-Year Treasury' },
  '20y': { id: 'DGS20', source: 'FRED', name: '20-Year Treasury' },
  '30y': { id: 'DGS30', source: 'FRED', name: '30-Year Treasury' },
  't10y2y': { id: 'T10Y2Y', source: 'FRED', name: '10Y-2Y Spread' },
  't10y3m': { id: 'T10Y3M', source: 'FRED', name: '10Y-3M Spread' },
  't5yie': { id: 'T5YIE', source: 'FRED', name: '5Y Breakeven Inflation' },
  't10yie': { id: 'T10YIE', source: 'FRED', name: '10Y Breakeven Inflation' },
  'dfii10': { id: 'DFII10', source: 'FRED', name: '10Y TIPS Real Yield' },
  'tips5y': { id: 'DFII5', source: 'FRED', name: '5Y TIPS Real Yield' },
  'tips10y': { id: 'DFII10', source: 'FRED', name: '10Y TIPS Real Yield' },
  'tips30y': { id: 'DFII30', source: 'FRED', name: '30Y TIPS Real Yield' },
  'fedBalanceSheet': { id: 'WALCL', source: 'FRED', name: 'Fed Balance Sheet' },
  'm2': { id: 'M2SL', source: 'FRED', name: 'M2 Money Supply' },
  'federalDebt': { id: 'GFDEBTN', source: 'FRED', name: 'Federal Debt' },
  'surplusDeficit': { id: 'FYFSD', source: 'FRED', name: 'Federal Surplus/Deficit' },
  'unemployment': { id: 'UNRATE', source: 'FRED', name: 'Unemployment Rate' },
  'laborParticipation': { id: 'CIVPART', source: 'FRED', name: 'Labor Participation Rate' },
  'gdp': { id: 'GDP', source: 'FRED', name: 'GDP Growth Rate' },
  'pce': { id: 'PCEPI', source: 'FRED', name: 'PCE Inflation' },
  'tb3ms': { id: 'TB3MS', source: 'FRED', name: '3-Month T-Bill Secondary Market' },
  'creditRatings': { id: '/api/bonds', source: 'S&P / Moody\'s / Fitch', name: 'Sovereign Credit Ratings', url: '/api/bonds' },
  'creditAaaAa': { id: '/api/bonds', source: 'S&P / Moody\'s / Fitch', name: 'AAA/AA Rated Count', url: '/api/bonds' },
  'creditInvGrade': { id: '/api/bonds', source: 'S&P / Moody\'s / Fitch', name: 'Investment Grade Count', url: '/api/bonds' },
  'debtToGdp': { id: 'GFDEBTN/GDP', source: 'FRED', name: 'Debt-to-GDP Ratio' },
  'cpiAll': { id: 'CPIAUCSL', source: 'FRED', name: 'CPI All Items' },
  'cpiCore': { id: 'CPILFESL', source: 'FRED', name: 'CPI Core (Less Food & Energy)' },
  'fxEUR': { id: 'DEXUSEU', source: 'FRED', name: 'EUR/USD Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'fxJPY': { id: 'DEXJPUS', source: 'FRED', name: 'USD/JPY Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'fxGBP': { id: 'DEXUSUK', source: 'FRED', name: 'GBP/USD Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'fxCHF': { id: 'DEXSZUS', source: 'FRED', name: 'USD/CHF Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'fxAUD': { id: 'DEXALUS', source: 'FRED', name: 'AUD/USD Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'fxCAD': { id: 'DEXCAUS', source: 'FRED', name: 'USD/CAD Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'dxy': { id: 'DTWEXBGS', source: 'FRED', name: 'Trade Weighted U.S. Dollar Index', url: '/api/fx' },
};

export function getSeriesInfo(key) {
  return SERIES_MAP[key] || null;
}

export function seriesUrl(seriesId) {
  return `${FRED_BASE}/${seriesId}`;
}

export function seriesApiUrl(seriesId) {
  const params = new URLSearchParams({ series_id: seriesId, api_key: FRED_API_KEY, file_type: 'json', sort_order: 'desc', limit: '5' });
  return `${FRED_API_BASE}?${params.toString()}`;
}

export default function MetricValue({ value, format, seriesKey, timestamp }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState(null);
  const rootRef = useRef(null);
  const popoverRef = useRef(null);
  const [measured, setMeasured] = useState(false);

  const info = seriesKey ? SERIES_MAP[seriesKey] : null;

  const open = useCallback(() => {
    if (!info) return;
    const rect = rootRef.current.getBoundingClientRect();
    const popoverWidth = Math.max(rect.width + 60, 280);
    const viewportWidth = window.innerWidth;
    const left = Math.max(8, Math.min(rect.left, viewportWidth - popoverWidth - 8));
    const below = rect.bottom + 4;
    const above = rect.top - 4;
    setPos({ below, above, left, width: popoverWidth });
    setShow(true);
    setMeasured(false);
  }, [info]);

  const close = useCallback(() => {
    setShow(false);
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (show) {
      close();
    } else {
      open();
    }
  }, [show, open, close]);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };
    const handleClickOutside = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      if (rootRef.current && rootRef.current.contains(e.target)) return;
      close();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [show, close]);

  useEffect(() => {
    if (!show || !pos || !popoverRef.current || measured) return;
    const el = popoverRef.current;
    const pH = el.offsetHeight;
    const viewportH = window.innerHeight;
    const fitsBelow = (pos.below + pH) <= viewportH - 8;
    const fitsAbove = pos.above - pH >= 8;
    let top;
    if (fitsBelow) {
      top = pos.below;
    } else if (fitsAbove) {
      top = pos.above - pH;
    } else {
      top = Math.max(8, viewportH - pH - 8);
    }
    el.style.top = `${top}px`;
    setMeasured(true);
  }, [show, pos, measured]);

  const formatted = value != null ? (format ? format(value) : `${value}`) : '\u2014';

  const isFRED = info && info.source === 'FRED';
  const tsInfo = formatTimestampUTC(timestamp);

  return (
    <>
      <span
        className={`mv-root${info ? ' mv-clickable' : ''}`}
        ref={rootRef}
        onClick={handleClick}
      >
        {formatted}
      </span>
      {show && pos && info && createPortal(
        <div
          ref={popoverRef}
          className="mv-popover"
          style={{ left: pos.left, width: pos.width }}
        >
          <div className="mv-popover-header">
            <div className="mv-name">{info.name}</div>
            <button className="mv-close" onClick={close} aria-label="Close">✕</button>
          </div>
          <table className="mv-table">
            <tbody>
              <tr><td className="mv-label">Source</td><td>{info.source}</td></tr>
              <tr><td className="mv-label">Series ID</td><td className="mv-mono">{info.id}</td></tr>
              <tr><td className="mv-label">Value</td><td className="mv-mono">{formatted}</td></tr>
              {tsInfo && (
                <tr><td className="mv-label">Updated</td><td>
                  <div>{tsInfo.local} <span className="mv-tz">{tsInfo.tz}</span></div>
                  <div className="mv-utc">{tsInfo.utc}</div>
                </td></tr>
              )}
            </tbody>
          </table>
          <div className="mv-links">
            {isFRED && (
              <>
                <a href={seriesUrl(info.id)} target="_blank" rel="noopener noreferrer">FRED Series Page</a>
                <a href={seriesApiUrl(info.id)} target="_blank" rel="noopener noreferrer">Fetch JSON</a>
              </>
            )}
            {!isFRED && info.url && (
              <a href={info.url} target="_blank" rel="noopener noreferrer">Fetch JSON</a>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}