import React, { useState } from 'react';
import MarketTabBar from './MarketTabBar';
import { DEFAULT_MARKET } from './markets.config';
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
};

export default function HubLayout() {
  const [activeMarket, setActiveMarket] = useState(DEFAULT_MARKET);
  const [currency, setCurrency] = useState('USD');
  const [snapshotDate, setSnapshotDate] = useState(null);

  const ActiveMarket = MARKET_COMPONENTS[activeMarket];

  return (
    <div className="hub-layout">
      <MarketTabBar
        activeMarket={activeMarket}
        setActiveMarket={setActiveMarket}
        currency={currency}
        setCurrency={setCurrency}
      />
      <ActiveMarket
        currency={currency}
        setCurrency={setCurrency}
        snapshotDate={snapshotDate}
        setSnapshotDate={setSnapshotDate}
      />
      <HubFooter />
    </div>
  );
}
