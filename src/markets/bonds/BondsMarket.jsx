import React, { useState } from 'react';
import { useBondsData } from './data/useBondsData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import YieldCurve        from './components/YieldCurve';
import CreditMatrix      from './components/CreditMatrix';
import SpreadMonitor     from './components/SpreadMonitor';
import DurationLadder    from './components/DurationLadder';
import BreakevenMonitor  from './components/BreakevenMonitor';
import './BondsMarket.css';

const SUB_TABS = [
  { id: 'yield-curve',     label: 'Yield Curve'    },
  { id: 'credit-matrix',   label: 'Credit Matrix'  },
  { id: 'spread-monitor',  label: 'Spread Monitor' },
  { id: 'duration-ladder', label: 'Duration Ladder' },
  { id: 'breakevens',      label: 'Breakevens'     },
];

function BondsMarket({ autoRefresh } = {}) {
  const [activeTab, setActiveTab] = useState('yield-curve');
  const { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, breakevensData, treasuryRates, fredYieldHistory, fedFundsFutures, yieldHistory, mortgageSpread, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useBondsData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="bonds-market">
      <div className="bonds-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`bonds-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bonds-status-bar">
        <span className={isLive ? 'bonds-status-live' : ''}>
          {isLive ? '● Live (FRED)' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="bonds-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="bonds-content">
        {activeTab === 'yield-curve'     && <YieldCurve     yieldCurveData={yieldCurveData} spreadIndicators={spreadIndicators} fredYieldHistory={fredYieldHistory} yieldHistory={yieldHistory} />}
        {activeTab === 'credit-matrix'   && <CreditMatrix   creditRatingsData={creditRatingsData} />}
        {activeTab === 'spread-monitor'  && <SpreadMonitor  spreadData={spreadData} mortgageSpread={mortgageSpread} />}
        {activeTab === 'duration-ladder' && <DurationLadder durationLadderData={durationLadderData} treasuryRates={treasuryRates} fedFundsFutures={fedFundsFutures} />}
        {activeTab === 'breakevens'      && <BreakevenMonitor breakevensData={breakevensData} />}
      </div>
    </div>
  );
}

export default React.memo(BondsMarket);
