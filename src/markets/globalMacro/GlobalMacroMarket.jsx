import React, { useState } from 'react';
import { useGlobalMacroData } from './data/useGlobalMacroData';
import MacroScorecard    from './components/MacroScorecard';
import GrowthInflation   from './components/GrowthInflation';
import CentralBankRates  from './components/CentralBankRates';
import DebtMonitor       from './components/DebtMonitor';
import './GlobalMacroMarket.css';

const SUB_TABS = [
  { id: 'scorecard',     label: 'Scorecard'           },
  { id: 'growth',        label: 'Growth & Inflation'  },
  { id: 'central-banks', label: 'Central Bank Rates'  },
  { id: 'debt',          label: 'Debt Monitor'        },
];

// snapshotDate/currency not used — macro data is annual, not snapshot-dependent
export default function GlobalMacroMarket() {
  const [activeTab, setActiveTab] = useState('scorecard');
  const { scorecardData, growthInflationData, centralBankData, debtData, isLive, lastUpdated, isLoading } = useGlobalMacroData();

  if (isLoading) {
    return (
      <div className="mac-market mac-loading">
        <div className="mac-loading-spinner" />
        <span className="mac-loading-text">Loading macro data…</span>
      </div>
    );
  }

  return (
    <div className="mac-market">
      <div className="mac-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`mac-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mac-status-bar">
        <span className={isLive ? 'mac-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="mac-content">
        {activeTab === 'scorecard'     && <MacroScorecard   scorecardData={scorecardData} />}
        {activeTab === 'growth'        && <GrowthInflation  growthInflationData={growthInflationData} />}
        {activeTab === 'central-banks' && <CentralBankRates centralBankData={centralBankData} />}
        {activeTab === 'debt'          && <DebtMonitor      debtData={debtData} />}
      </div>
    </div>
  );
}
