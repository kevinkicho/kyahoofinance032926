// src/markets/derivatives/DerivativesMarket.jsx
import React, { useState } from 'react';
import { useDerivativesData } from './data/useDerivativesData';
import VolSurface       from './components/VolSurface';
import VIXTermStructure from './components/VIXTermStructure';
import OptionsFlow      from './components/OptionsFlow';
import './DerivativesMarket.css';

const SUB_TABS = [
  { id: 'vol-surface',        label: 'Vol Surface'        },
  { id: 'vix-term-structure', label: 'VIX Term Structure' },
  { id: 'options-flow',       label: 'Options Flow'       },
];

export default function DerivativesMarket() {
  const [activeTab, setActiveTab] = useState('vol-surface');
  const { volSurfaceData, vixTermStructure, optionsFlow, vixEnrichment, volPremium, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useDerivativesData();

  if (isLoading) {
    return (
      <div className="deriv-market deriv-loading">
        <div className="deriv-loading-spinner" />
        <span className="deriv-loading-text">Loading derivatives data…</span>
      </div>
    );
  }

  return (
    <div className="deriv-market">
      <div className="deriv-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
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
        {activeTab === 'vol-surface'        && <VolSurface       volSurfaceData={volSurfaceData} volPremium={volPremium} />}
        {activeTab === 'vix-term-structure' && <VIXTermStructure vixTermStructure={vixTermStructure} vixEnrichment={vixEnrichment} />}
        {activeTab === 'options-flow'       && <OptionsFlow      optionsFlow={optionsFlow} />}
      </div>
    </div>
  );
}
