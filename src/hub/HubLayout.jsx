import React, { useState, useRef, useCallback, Suspense, lazy } from 'react';
import MarketTabBar from './MarketTabBar';
import { DEFAULT_MARKET, MARKETS } from './markets.config';
import HubFooter from './HubFooter';

const MARKET_COMPONENTS = {
  equities:          lazy(() => import('../markets/equities/EquitiesMarket')),
  bonds:             lazy(() => import('../markets/bonds/BondsMarket')),
  fx:                lazy(() => import('../markets/fx/FXMarket')),
  derivatives:       lazy(() => import('../markets/derivatives/DerivativesMarket')),
  realEstate:        lazy(() => import('../markets/realEstate/RealEstateMarket')),
  insurance:         lazy(() => import('../markets/insurance/InsuranceMarket')),
  commodities:       lazy(() => import('../markets/commodities/CommoditiesMarket')),
  globalMacro:       lazy(() => import('../markets/globalMacro/GlobalMacroMarket')),
  equitiesDeepDive:  lazy(() => import('../markets/equitiesDeepDive/EquitiesDeepDiveMarket')),
  crypto:            lazy(() => import('../markets/crypto/CryptoMarket')),
  credit:            lazy(() => import('../markets/credit/CreditMarket')),
  sentiment:         lazy(() => import('../markets/sentiment/SentimentMarket')),
  calendar:          lazy(() => import('../markets/calendar/CalendarMarket')),
};

function MarketFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
      Loading market...
    </div>
  );
}

export default function HubLayout() {
  const [activeMarket, setActiveMarket] = useState(DEFAULT_MARKET);
  const [currency, setCurrency] = useState('USD');
  const [snapshotDate, setSnapshotDate] = useState(null);
  const contentRef = useRef(null);

  const ActiveMarket = MARKET_COMPONENTS[activeMarket];

  const handleExport = useCallback(async () => {
    if (!contentRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(contentRef.current, { useCORS: true, scale: 2 });
    const link = document.createElement('a');
    const marketLabel = MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `${marketLabel}-${date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [activeMarket]);

  return (
    <div className="hub-layout">
      <MarketTabBar
        activeMarket={activeMarket}
        setActiveMarket={setActiveMarket}
        currency={currency}
        setCurrency={setCurrency}
        onExport={handleExport}
      />
      <div ref={contentRef}>
        <Suspense fallback={<MarketFallback />}>
          <ActiveMarket
            currency={currency}
            setCurrency={setCurrency}
            snapshotDate={snapshotDate}
            setSnapshotDate={setSnapshotDate}
          />
        </Suspense>
      </div>
      <HubFooter />
    </div>
  );
}
