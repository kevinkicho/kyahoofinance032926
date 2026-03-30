import React from 'react';
import './TimeTravel.css';

export const ERAS = [
  {
    id: '2019',
    year: '2019',
    label: 'Pre-COVID Bull',
    emoji: '\u{1F7E2}',
    color: '#22c55e',
    headline: 'Zero-Rate Paradise',
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
    story: 'Within 33 days, the S&P fell 34%. Airlines halted. Oil went negative. Cruise lines nearly bankrupted. The Fed launched emergency QE and cut to zero overnight.',
    context: ['Oil: -$37/barrel!', 'Unemployment: 14.7%', 'S&P -34% in 33 days', 'Fed: 0% emergency rate'],
    multipliers: { Technology: 0.65, Financials: 0.55, Energy: 0.45, Healthcare: 1.10, Consumer: 0.70, Industrials: 0.60 }
  },
  {
    id: 'dec2021',
    year: "Dec '21",
    label: 'Meme Peak',
    emoji: '\u{1F680}',
    color: '#a855f7',
    headline: 'Stimulus Overflow',
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
    story: 'The fastest tightening cycle in 40 years. 425bps in 12 months. NASDAQ lost a third of its value. Bonds crashed. Growth stocks imploded. Only energy survived amid the Ukraine supply shock.',
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
    story: 'ChatGPT triggered a CapEx arms race. Nvidia became the most valuable company on earth. Mag-7 returned +75%. The "soft landing" narrative took hold and the market repriced AI TAM upward by trillions.',
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
    story: 'You are here. Use the scenario sliders below to model your own economic thesis. Where do YOU think rates, inflation, and risk appetite go from here? The market is yours to reshape.',
    context: ['Sliders Active', 'Real-time Modeling', 'FRED Live Data', '2,500+ Equities'],
    multipliers: { Technology: 1.0, Financials: 1.0, Energy: 1.0, Healthcare: 1.0, Consumer: 1.0, Industrials: 1.0 }
  }
];

const TimeTravel = ({ activeEra, setActiveEra }) => {
  const era = ERAS.find(e => e.id === activeEra) || ERAS[ERAS.length - 1];

  return (
    <div className="timetravel-container">
      <div className="timeline-rail">
        {ERAS.map((e, idx) => (
          <React.Fragment key={e.id}>
            <button
              className={`era-node ${activeEra === e.id ? 'active' : ''}`}
              style={{ '--era-color': e.color }}
              onClick={() => setActiveEra(e.id)}
              title={e.label}
            >
              <span className="era-emoji">{e.emoji}</span>
              <span className="era-year">{e.year}</span>
              <div className="era-tooltip">
                <span className="et-label">{e.label}</span>
                <span className="et-hint">Click to jump</span>
              </div>
            </button>
            {idx < ERAS.length - 1 && <div className="era-connector" />}
          </React.Fragment>
        ))}
      </div>

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
      </div>
    </div>
  );
};

export default TimeTravel;
