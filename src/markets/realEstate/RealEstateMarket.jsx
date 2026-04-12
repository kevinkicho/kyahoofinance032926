import React from 'react';
import { useRealEstateData } from './data/useRealEstateData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import RealEstateDashboard from './components/RealEstateDashboard';
import './components/RealEstateDashboard.css';

function RealEstateMarket({ autoRefresh } = {}) {
  const {
    priceIndexData, reitData, affordabilityData, capRateData, mortgageRates,
    caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y,
    housingStarts, existingHomeSales, rentalVacancy, medianHomePrice,
    foreclosureData, mbaApplications, creDelinquencies,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useRealEstateData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="re-market">
      <div className="re-status-bar">
        <span className={isLive ? 're-status-live' : ''}>
          {isLive ? '● Live · Yahoo Finance / BIS / FRED' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="re-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <RealEstateDashboard
        priceIndexData={priceIndexData}
        reitData={reitData}
        affordabilityData={affordabilityData}
        capRateData={capRateData}
        mortgageRates={mortgageRates}
        caseShillerData={caseShillerData}
        supplyData={supplyData}
        homeownershipRate={homeownershipRate}
        rentCpi={rentCpi}
        reitEtf={reitEtf}
        treasury10y={treasury10y}
        housingStarts={housingStarts}
        existingHomeSales={existingHomeSales}
        rentalVacancy={rentalVacancy}
        medianHomePrice={medianHomePrice}
        foreclosureData={foreclosureData}
        mbaApplications={mbaApplications}
        creDelinquencies={creDelinquencies}
      />
    </div>
  );
}

export default React.memo(RealEstateMarket);