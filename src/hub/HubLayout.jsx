import React, { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import MarketTabBar from './MarketTabBar';
import { DEFAULT_MARKET, MARKETS } from './markets.config';
import EquitiesMarket        from '../markets/equities/EquitiesMarket';
import BondsMarket           from '../markets/bonds/BondsMarket';
import FXMarket              from '../markets/fx/FXMarket';
import DerivativesMarket     from '../markets/derivatives/DerivativesMarket';
import RealEstateMarket      from '../markets/realEstate/RealEstateMarket';
import InsuranceMarket       from '../markets/insurance/InsuranceMarket';
import CommoditiesMarket     from '../markets/commodities/CommoditiesMarket';
import GlobalMacroMarket     from '../markets/globalMacro/GlobalMacroMarket';
import EquitiesDeepDiveMarket from '../markets/equitiesDeepDive/EquitiesDeepDiveMarket';
import CryptoMarket          from '../markets/crypto/CryptoMarket';
import CreditMarket from '../markets/credit/CreditMarket';
import SentimentMarket from '../markets/sentiment/SentimentMarket';
import CalendarMarket from '../markets/calendar/CalendarMarket';
import HubFooter from './HubFooter';

const MARKET_COMPONENTS = {
  equities:          EquitiesMarket,
  bonds:             BondsMarket,
  fx:                FXMarket,
  derivatives:       DerivativesMarket,
  realEstate:        RealEstateMarket,
  insurance:         InsuranceMarket,
  commodities:       CommoditiesMarket,
  globalMacro:       GlobalMacroMarket,
  equitiesDeepDive:  EquitiesDeepDiveMarket,
  crypto:            CryptoMarket,
  credit:            CreditMarket,
  sentiment:         SentimentMarket,
  calendar:          CalendarMarket,
};

export default function HubLayout() {
  const [activeMarket, setActiveMarket] = useState(DEFAULT_MARKET);
  const [currency, setCurrency] = useState('USD');
  const [snapshotDate, setSnapshotDate] = useState(null);
  const contentRef = useRef(null);

  const ActiveMarket = MARKET_COMPONENTS[activeMarket];

  const handleExport = useCallback(async () => {
    if (!contentRef.current) return;
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
        <ActiveMarket
          currency={currency}
          setCurrency={setCurrency}
          snapshotDate={snapshotDate}
          setSnapshotDate={setSnapshotDate}
        />
      </div>
      <HubFooter />
    </div>
  );
}
