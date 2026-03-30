import React, { useState } from 'react';
import './DetailPanel.css';

// --- Fair Value Model ---
// Deterministic DCF-lite using sector P/E norms + rate/inflation adjustments
const computeFairValue = (ticker, details, scenarios) => {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  const seed = Math.abs(hash);
  const rand = (min, max) => min + (seed % 1000) / 1000 * (max - min);

  // Sector-specific base P/E
  const sectorPE = {
    Technology: 28, Financials: 12, Healthcare: 22,
    Energy: 14, Consumer: 18, Industrials: 16
  };
  const basePE = sectorPE[ticker.sector] || 18;

  // Rate & inflation adjustments on required return
  const rateAdj = scenarios.interestRate / 10000;      // bps to decimal
  const inflAdj = (scenarios.inflation - 2) / 100;
  const adjustedPE = basePE * (1 - rateAdj * 3) * (1 - inflAdj * 0.5);

  // Derive EPS from raw price string (fallback)
  const rawPrice = parseFloat((details.price || '100').replace(/[^0-9.]/g, '')) || rand(50, 500);
  const currentEPS = rawPrice / (parseFloat(details.pe) || rand(12, 35));
  const fairPrice = adjustedPE * currentEPS;

  const pctDiff = ((fairPrice - rawPrice) / rawPrice) * 100;
  const upside = pctDiff > 0;

  // Probabilistic 12-month range via beta-adjusted std dev
  const beta = parseFloat(details.beta) || 1;
  const baseVol = 0.25; // 25% annual vol baseline
  const adjVol = baseVol * beta * (1 + Math.abs(rateAdj) * 2);
  const rangeHigh = fairPrice * (1 + adjVol);
  const rangeLow = fairPrice * (1 - adjVol * 0.6); // skewed right

  return { fairPrice, rawPrice, pctDiff, upside, rangeHigh, rangeLow, adjustedPE };
};

const FairValueBar = ({ rawPrice, fairPrice, rangeLow, rangeHigh, sym }) => {
  // Normalise position within range
  const total = rangeHigh - rangeLow;
  const curPos  = Math.min(100, Math.max(0, ((rawPrice  - rangeLow) / total) * 100));
  const fairPos = Math.min(100, Math.max(0, ((fairPrice - rangeLow) / total) * 100));
  return (
    <div className="fv-bar-wrap">
      <div className="fv-bar-track">
        <div className="fv-bar-fill" style={{ width: `${fairPos}%` }} />
        <div className="fv-bar-cursor" style={{ left: `${curPos}%` }} title={`Current: ${sym}${rawPrice.toFixed(0)}`} />
        <div className="fv-bar-target" style={{ left: `${fairPos}%` }} title={`Fair Value: ${sym}${fairPrice.toFixed(0)}`} />
      </div>
      <div className="fv-bar-labels">
        <span>{sym}{rangeLow.toFixed(0)}</span>
        <span>12-mo Range</span>
        <span>{sym}{rangeHigh.toFixed(0)}</span>
      </div>
    </div>
  );
};

const DetailPanel = ({ selectedTicker, setSelectedTicker, scenarios }) => {
  const { details } = selectedTicker;
  const [activeTab, setActiveTab] = useState('summary');

  const sym = selectedTicker.regionSymbol || '$';
  const fv = computeFairValue(selectedTicker, details, scenarios || { riskAppetite: 50, interestRate: 0, inflation: 2 });

  return (
    <div className="detail-panel-content">
      <div className="detail-header">
        <div>
          <h2 className="detail-ticker">
            {selectedTicker.ticker}
            {selectedTicker.isLive && <span className="live-pill">LIVE</span>}
          </h2>
          <p className="detail-region">{selectedTicker.region} ({selectedTicker.regionCurrency})</p>
        </div>
        <button className="close-btn" onClick={() => setSelectedTicker(null)}>✕</button>
      </div>

      <div className="detail-price-section">
        <span className="large-price">{details.price}</span>
        <span className={`detail-change ${details.changeAmt.includes('+') ? 'text-green' : 'text-red'}`}>
          {details.changeAmt} ({details.changePct})
        </span>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        <button className={activeTab === 'summary' ? 'tab active' : 'tab'} onClick={() => setActiveTab('summary')}>Summary</button>
        <button className={activeTab === 'fairvalue' ? 'tab active' : 'tab'} onClick={() => setActiveTab('fairvalue')}>Fair Value</button>
      </div>

      {activeTab === 'summary' && (
        <div className="data-metrics">
          <div className="metric-row"><span>Previous Close</span><strong>{details.prevClose}</strong></div>
          <div className="metric-row"><span>Open</span><strong>{details.open}</strong></div>
          <div className="metric-row"><span>Bid</span><strong>{details.bid}</strong></div>
          <div className="metric-row"><span>Ask</span><strong>{details.ask}</strong></div>
          <div className="metric-row"><span>Day's Range</span><strong>{details.dayRange}</strong></div>
          <div className="metric-row"><span>52 Week Range</span><strong>{details.wk52Range}</strong></div>
          <div className="metric-row"><span>Volume</span><strong>{details.volume}</strong></div>
          <div className="metric-row"><span>Avg. Volume</span><strong>{details.avgVol}</strong></div>
          <div className="metric-row"><span>Market Cap (Glob.)</span><strong style={{color: '#93c5fd'}}>{details.marketCapGlobal}</strong></div>
          <div className="metric-row"><span>Beta (5Y Monthly)</span><strong>{details.beta}</strong></div>
          <div className="metric-row"><span>PE Ratio (TTM)</span><strong>{details.pe}</strong></div>
          <div className="metric-row"><span>EPS (TTM)</span><strong>{details.eps}</strong></div>
          <div className="metric-row"><span>Earnings Date</span><strong>{details.earningsDate}</strong></div>
          <div className="metric-row"><span>Forward Dividend</span><strong>{details.dividend}</strong></div>
        </div>
      )}

      {activeTab === 'fairvalue' && (
        <div className="fv-panel">
          <div className={`fv-verdict ${fv.upside ? 'undervalued' : 'overvalued'}`}>
            <span className="fv-label">{fv.upside ? '🟢 UNDERVALUED' : '🔴 OVERVALUED'}</span>
            <span className="fv-pct">{fv.upside ? '+' : ''}{fv.pctDiff.toFixed(1)}% vs. current</span>
          </div>

          <div className="fv-grid">
            <div className="fv-stat">
              <span className="fv-stat-label">Current Price</span>
              <span className="fv-stat-value">{sym}{fv.rawPrice.toFixed(2)}</span>
            </div>
            <div className="fv-stat">
              <span className="fv-stat-label">Model Fair Value</span>
              <span className={`fv-stat-value ${fv.upside ? 'text-green' : 'text-red'}`}>{sym}{fv.fairPrice.toFixed(2)}</span>
            </div>
            <div className="fv-stat">
              <span className="fv-stat-label">Adj. P/E Used</span>
              <span className="fv-stat-value">{fv.adjustedPE.toFixed(1)}x</span>
            </div>
            <div className="fv-stat">
              <span className="fv-stat-label">Sector</span>
              <span className="fv-stat-value sector-pill">{selectedTicker.sector || '—'}</span>
            </div>
          </div>

          <div className="fv-bar-section">
            <p className="fv-bar-title">12-Month Probabilistic Range</p>
            <FairValueBar
              rawPrice={fv.rawPrice}
              fairPrice={fv.fairPrice}
              rangeLow={fv.rangeLow}
              rangeHigh={fv.rangeHigh}
              sym={sym}
            />
          </div>

          <div className="fv-disclaimer">
            ⚠ Model-generated estimate. Based on active macro scenario.
            Adjust scenario sliders to see how rates &amp; inflation shift valuations.
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailPanel;
