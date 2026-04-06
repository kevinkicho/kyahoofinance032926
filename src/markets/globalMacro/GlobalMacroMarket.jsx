import React, { useState } from 'react';
import { useGlobalMacroData } from './data/useGlobalMacroData';
import MarketSkeleton from '../../hub/MarketSkeleton';
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
function GlobalMacroMarket() {
  const [activeTab, setActiveTab] = useState('scorecard');
  const {
    scorecardData, growthInflationData, centralBankData, debtData,
    m2Growth, tradeBalance, industrialProd, consumerSentiment, yieldSpread,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useGlobalMacroData();

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="mac-market">
      <div className="mac-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`mac-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mac-status-bar">
        <span className={isLive ? 'mac-status-live' : ''}>
          {isLive ? '● Live · World Bank / FRED' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="mac-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="mac-content">
        {activeTab === 'scorecard'     && <MacroScorecard   scorecardData={scorecardData} consumerSentiment={consumerSentiment} tradeBalance={tradeBalance} m2Growth={m2Growth} />}
        {activeTab === 'growth'        && <GrowthInflation  growthInflationData={growthInflationData} industrialProd={industrialProd} consumerSentiment={consumerSentiment} />}
        {activeTab === 'central-banks' && <CentralBankRates centralBankData={centralBankData} />}
        {activeTab === 'debt'          && <DebtMonitor      debtData={debtData} yieldSpread={yieldSpread} m2Growth={m2Growth} />}
      </div>
    </div>
  );
}

export default React.memo(GlobalMacroMarket);
