import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import RealEstateDashboard from './components/RealEstateDashboard';
import './components/RealEstateDashboard.css';

function getRealEstateProps(centralData) {
  const d = centralData.data || {};
  return {
    priceIndexData: d.priceIndexData,
    reitData: d.reitData,
    affordabilityData: d.affordabilityData,
    capRateData: d.capRateData,
    mortgageRates: d.mortgageRates,
    caseShillerData: d.caseShillerData,
    supplyData: d.supplyData,
    homeownershipRate: d.homeownershipRate,
    rentCpi: d.rentCpi,
    reitEtf: d.reitEtf,
    treasury10y: d.treasury10y,
    housingStarts: d.housingStarts,
    existingHomeSales: d.existingHomeSales,
    rentalVacancy: d.rentalVacancy,
    medianHomePrice: d.medianHomePrice,
    foreclosureData: d.foreclosureData,
    mbaApplications: d.mbaApplications,
    creDelinquencies: d.creDelinquencies,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function RealEstateMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getRealEstateProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="re-market">

      <RealEstateDashboard
        priceIndexData={props.priceIndexData}
        reitData={props.reitData}
        affordabilityData={props.affordabilityData}
        capRateData={props.capRateData}
        mortgageRates={props.mortgageRates}
        caseShillerData={props.caseShillerData}
        supplyData={props.supplyData}
        homeownershipRate={props.homeownershipRate}
        rentCpi={props.rentCpi}
        reitEtf={props.reitEtf}
        treasury10y={props.treasury10y}
        housingStarts={props.housingStarts}
        existingHomeSales={props.existingHomeSales}
        rentalVacancy={props.rentalVacancy}
        medianHomePrice={props.medianHomePrice}
        foreclosureData={props.foreclosureData}
        mbaApplications={props.mbaApplications}
        creDelinquencies={props.creDelinquencies}
        error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
        fetchLog={props.fetchLog}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
    </div>
  );
}

export default React.memo(RealEstateMarket);