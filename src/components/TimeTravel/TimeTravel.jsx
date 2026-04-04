import React, { useCallback, useRef } from 'react';
import './TimeTravel.css';

export const ERAS = [
  {
    id: '2019',
    year: '2019',
    label: 'Pre-COVID Bull',
    emoji: '\u{1F7E2}',
    color: '#22c55e',
    headline: 'Zero-Rate Paradise',
    snapDate: null, // outside 5yr data window — uses multipliers
    story: 'The Fed cut rates three times in 2019. QE was on. Money was free. Tech soared, buybacks hit records, and nobody thought the party could end.',
    context: ['Fed rate: 1.75%', 'S&P 500: +31.5% YoY', 'VIX: ~12 (calm seas)', 'No inflation threat'],
    multipliers: { Technology: 1.35, Financials: 1.25, Energy: 1.05, Healthcare: 1.20, Consumer: 1.25, Industrials: 1.30 }
  },
  {
    id: 'mar2020',
    year: "Mar '20",
    label: 'COVID Crash',
    emoji: '\u{1F534}',
    color: '#ef4444',
    headline: 'The World Stops',
    snapDate: null, // outside 5yr data window — uses multipliers
    story: 'Within 33 days, the S&P fell 34%. Airlines halted. Oil went negative. Cruise lines nearly bankrupted. The Fed launched emergency QE and cut to zero overnight.',
    context: ['Oil: -$37/barrel!', 'Unemployment: 14.7%', 'S&P -34% in 33 days', 'Fed: 0% emergency rate'],
    multipliers: { Technology: 0.65, Financials: 0.55, Energy: 0.45, Healthcare: 1.10, Consumer: 0.70, Industrials: 0.60 }
  },
  {
    id: 'dec2021',
    year: "Nov '21",
    label: 'Meme Peak',
    emoji: '\u{1F680}',
    color: '#a855f7',
    headline: 'Stimulus Overflow',
    snapDate: '2021-11-18',
    story: 'Stimmy checks, zero rates, and Reddit fueled the most speculative market since 1999. GME surged 1,700%. Crypto hit $69K. Every SPAC was "the future." Then came the bill.',
    context: ['M2 supply: +25% YoY', 'Crypto MCap: $3T', 'Inflation: 7%', 'Fed: "transitory"'],
    multipliers: { Technology: 1.80, Financials: 1.40, Energy: 0.95, Healthcare: 1.15, Consumer: 1.35, Industrials: 1.20 }
  },
  {
    id: 'dec2022',
    year: "Dec '22",
    label: 'Rate Shock',
    emoji: '\u{1F4C9}',
    color: '#f97316',
    headline: "The Fed's Hammer",
    snapDate: '2022-12-30',
    story: 'The fastest tightening cycle in 40 years. 425bps in 12 months. NASDAQ lost a third of its value. Bonds crashed. Growth stocks imploded. Only energy survived.',
    context: ['Fed rate: 4.50%', 'NASDAQ: -33% YoY', 'Energy (XLE): +65%', 'US 10yr yield: 3.88%'],
    multipliers: { Technology: 0.62, Financials: 1.08, Energy: 1.55, Healthcare: 0.95, Consumer: 0.82, Industrials: 1.10 }
  },
  {
    id: 'dec2023',
    year: "Dec '23",
    label: 'AI Awakening',
    emoji: '\u{1F916}',
    color: '#38bdf8',
    headline: 'The Nvidia Supercycle',
    snapDate: '2023-12-29',
    story: 'ChatGPT triggered a CapEx arms race. Nvidia became the most valuable company on earth. Mag-7 returned +75%. The "soft landing" narrative took hold.',
    context: ['NVDA: +239% YoY', 'Mag-7: +75%', 'US CPI: 3.1% (falling)', 'Fed pivot expected'],
    multipliers: { Technology: 1.55, Financials: 1.15, Energy: 0.92, Healthcare: 1.05, Consumer: 1.10, Industrials: 1.20 }
  },
  {
    id: '2025',
    year: 'Now',
    label: 'Your Scenario',
    emoji: '\u{1F4CD}',
    color: '#3b82f6',
    headline: 'The Sandbox',
    snapDate: null,
    story: 'You are here. Use the date slider to rewind to any day in the past 5 years, or use the scenario sliders below to model your own economic thesis.',
    context: ['Sliders Active', 'Real-time Modeling', 'FRED Live Data', '351 Equities'],
    multipliers: { Technology: 1.0, Financials: 1.0, Energy: 1.0, Healthcare: 1.0, Consumer: 1.0, Industrials: 1.0 }
  }
];

// 5-year data window
const DATA_START = new Date('2021-04-05').getTime();
const DATA_END   = Date.now() - 86400000; // yesterday

function tsToDate(ts) {
  return new Date(ts).toISOString().split('T')[0];
}

function dateToTs(dateStr) {
  return new Date(dateStr).getTime();
}

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 7)   return `${days}d ago`;
  if (days < 31)  return `${Math.floor(days/7)}w ago`;
  if (days < 365) return `${Math.floor(days/30)}mo ago`;
  return `${(days/365).toFixed(1)}yr ago`;
}

const TimeTravel = ({ activeEra, setActiveEra, snapshotDate, setSnapshotDate, snapshotLoading, hasRealData }) => {
  const era = ERAS.find(e => e.id === activeEra) || ERAS[ERAS.length - 1];
  const debounceRef = useRef(null);

  const sliderValue = snapshotDate
    ? Math.round(dateToTs(snapshotDate) / 86400000)
    : Math.round(DATA_END / 86400000);

  const handleSlider = useCallback((e) => {
    const ts = parseInt(e.target.value) * 86400000;
    const dateStr = tsToDate(ts);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSnapshotDate(dateStr), 350);
  }, [setSnapshotDate]);

  const handleEraClick = useCallback((e) => {
    setActiveEra(e.id);
    if (e.snapDate) {
      setSnapshotDate(e.snapDate);
    } else {
      setSnapshotDate(null); // "2025 / Now" or pre-data eras use multipliers
    }
  }, [setActiveEra, setSnapshotDate]);

  const handleNow = useCallback(() => {
    setSnapshotDate(null);
    setActiveEra('2025');
  }, [setSnapshotDate, setActiveEra]);

  const isRealData = !!snapshotDate && hasRealData;

  return (
    <div className="timetravel-container">

      {/* ── Real Date Slider ─────────────────────────────── */}
      <div className="tt-slider-section">
        <div className="tt-slider-header">
          <span className="tt-slider-label">Navigate History</span>
          {snapshotLoading && <span className="tt-loading">⟳ Loading…</span>}
          {isRealData && !snapshotLoading && (
            <span className="tt-real-badge">📊 Real data</span>
          )}
          {!isRealData && !snapshotLoading && (
            <span className="tt-model-badge">⚙ Era model</span>
          )}
        </div>

        <input
          type="range"
          className="tt-slider"
          min={Math.round(DATA_START / 86400000)}
          max={Math.round(DATA_END / 86400000)}
          value={sliderValue}
          onChange={handleSlider}
        />

        <div className="tt-slider-dates">
          <span className="tt-date-edge">Apr 2021</span>
          {snapshotDate && (
            <span className="tt-date-current">
              {formatDisplayDate(snapshotDate)}
              <span className="tt-date-ago"> · {daysAgo(snapshotDate)}</span>
            </span>
          )}
          <button className="tt-now-btn" onClick={handleNow}>Live ▶</button>
        </div>
      </div>

      {/* ── Era Rail ─────────────────────────────────────── */}
      <div className="timeline-rail">
        {ERAS.map((e, idx) => (
          <React.Fragment key={e.id}>
            <button
              className={`era-node ${activeEra === e.id ? 'active' : ''} ${e.snapDate ? 'has-data' : ''}`}
              style={{ '--era-color': e.color }}
              onClick={() => handleEraClick(e)}
              title={e.snapDate ? `${e.label} · ${e.snapDate}` : `${e.label} · model only`}
            >
              <span className="era-emoji">{e.emoji}</span>
              <span className="era-year">{e.year}</span>
              {e.snapDate && <span className="era-data-dot" />}
              <div className="era-tooltip">
                <span className="et-label">{e.label}</span>
                <span className="et-hint">{e.snapDate ? '📊 Real data' : '⚙ Model'}</span>
              </div>
            </button>
            {idx < ERAS.length - 1 && <div className="era-connector" />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Era Story Card ───────────────────────────────── */}
      <div className="era-card" key={era.id} style={{ '--era-color': era.color }}>
        <div className="era-card-header">
          <div>
            <h3 className="era-headline">{era.headline}</h3>
            <p className="era-sublabel">{era.label}</p>
          </div>
          <span className="era-badge">{era.year}</span>
        </div>
        <p className="era-story">{era.story}</p>
        <div className="era-context-grid">
          {era.context.map((ctx, i) => (
            <div key={i} className="era-ctx-chip">{ctx}</div>
          ))}
        </div>
        {(!isRealData || !era.snapDate) && (
          <div className="era-sector-impacts">
            {Object.entries(era.multipliers).map(([sector, mult]) => {
              const pct = ((mult - 1) * 100).toFixed(0);
              const up = mult >= 1;
              return (
                <div key={sector} className="sector-impact-bar">
                  <span className="impact-label">{sector}</span>
                  <div className="impact-track">
                    <div
                      className={`impact-fill ${up ? 'up' : 'down'}`}
                      style={{ width: `${Math.min(100, Math.abs(mult - 1) * 150)}%` }}
                    />
                  </div>
                  <span className={`impact-pct ${up ? 'text-green' : 'text-red'}`}>
                    {up ? '+' : ''}{pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {isRealData && era.snapDate && (
          <div className="tt-real-note">
            📊 Treemap sized by actual closing prices on {formatDisplayDate(snapshotDate)}.
            Cell sizes show real relative market caps — not estimates.
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTravel;
