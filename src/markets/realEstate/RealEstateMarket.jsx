import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import { useMarketData } from '../../hub/DataContext';
import { useCurrency } from '../../hub/CurrencyContext';
import RealEstateDashboard from './components/RealEstateDashboard';
import { normalizeRealEstateData } from '../../data/marketNormalizers';
import './components/RealEstateDashboard.css';
import './RealEstateMarket.css';
import '../census/CensusMarket.css';

function getRealEstateProps(centralData, context = {}) {
  const d = centralData.data || {};
  const normalized = normalizeRealEstateData(d, context);
  return {
    priceIndexData: d.priceIndexData,
    reitData: d.reitData,
    affordabilityData: d.affordabilityData,
    capRateData: normalized.values.capRateData,
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
    hudData: d.hudData,
    fhfaHpi: d.fhfaHpi,
    commoditiesData: d.commoditiesData || normalized.values.commoditiesData,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
    normalized,
  };
}

function RealEstateMarket({ centralData } = {}) {
  const commoditiesCtx = useMarketData('commodities');
  const censusCtx = useMarketData('census');
  const { convert, currentSymbol } = useCurrency();
  if (!centralData) return <MarketSkeleton />;
  const props = getRealEstateProps(centralData, { commodities: commoditiesCtx?.data });

  const commoditiesData = props.commoditiesData || commoditiesCtx?.data;
  const censusData = censusCtx?.data;

  
  return (
    // RealEstateDashboard's "Key Metrics" bento panel is a superset of the
    // old loose <RealEstateSidebar>, so the sidebar and the outer
    // two-column grid (`--with-sidebar`) are gone.
    <div className="re-market" role="region" aria-label="Real Estate">
      <div className="re-market-main">
        <RealEstateDashboard
          convert={convert}
          currentSymbol={currentSymbol}
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
          hudData={props.hudData}
          fhfaHpi={props.fhfaHpi}
          commoditiesData={commoditiesData}
          censusData={censusData}
          error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
          isHistorical={props.isHistorical} asOfDate={props.asOfDate}
          fetchLog={props.fetchLog}
          isLive={props.isLive}
          lastUpdated={props.lastUpdated}
        />
      </div>
    </div>
  );
}

export default React.memo(RealEstateMarket);
