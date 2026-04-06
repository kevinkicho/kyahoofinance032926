// src/markets/derivatives/DerivativesMarket.jsx
import React, { useState } from 'react';
import { useDerivativesData } from './data/useDerivativesData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import VolSurface       from './components/VolSurface';
import VIXTermStructure from './components/VIXTermStructure';
import OptionsFlow      from './components/OptionsFlow';
import './DerivativesMarket.css';

const SUB_TABS = [
  { id: 'vol-surface',        label: 'Vol Surface'        },
  { id: 'vix-term-structure', label: 'VIX Term Structure' },
  { id: 'options-flow',       label: 'Options Flow'       },
];

function DerivativesMarket({ autoRefresh } = {}) {
  const [activeTab, setActiveTab] = useState('vol-surface');
  const { volSurfaceData, vixTermStructure, optionsFlow, vixEnrichment, volPremium, fredVixHistory, putCallRatio, skewIndex, vixPercentile, termSpread, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useDerivativesData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="deriv-market">
      <div className="deriv-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`deriv-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="deriv-status-bar">
        <span className={isLive ? 'deriv-status-live' : ''}>
          {isLive ? '● Live · Yahoo Finance / CBOE' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="deriv-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="deriv-content">
        {activeTab === 'vol-surface'        && <VolSurface       volSurfaceData={volSurfaceData} volPremium={volPremium} skewIndex={skewIndex} />}
        {activeTab === 'vix-term-structure' && <VIXTermStructure vixTermStructure={vixTermStructure} vixEnrichment={vixEnrichment} fredVixHistory={fredVixHistory} vixPercentile={vixPercentile} termSpread={termSpread} putCallRatio={putCallRatio} />}
        {activeTab === 'options-flow'       && <OptionsFlow      optionsFlow={optionsFlow} />}
      </div>
    </div>
  );
}

export default React.memo(DerivativesMarket);
