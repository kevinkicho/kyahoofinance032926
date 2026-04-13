import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';

const SERVER = '';

export function useRealEstateData(autoRefresh = false, refreshKey = 0) {
  const [priceIndexData,    setPriceIndexData]    = useState(null);
  const [reitData,          setReitData]          = useState(null);
  const [affordabilityData, setAffordabilityData] = useState(null);
  const [capRateData,       setCapRateData]       = useState(null);
  const [mortgageRates,     setMortgageRates]     = useState(null);
  const [caseShillerData,   setCaseShillerData]   = useState(null);
  const [supplyData,        setSupplyData]        = useState(null);
  const [homeownershipRate, setHomeownershipRate] = useState(null);
  const [rentCpi,           setRentCpi]           = useState(null);
  const [reitEtf,           setReitEtf]           = useState(null);
  const [treasury10y,       setTreasury10y]       = useState(null);
  const [housingStarts,     setHousingStarts]     = useState(null);
  const [existingHomeSales, setExistingHomeSales] = useState(null);
  const [rentalVacancy,     setRentalVacancy]     = useState(null);
  const [medianHomePrice,   setMedianHomePrice]   = useState(null);
  const [foreclosureData,   setForeclosureData]   = useState(null);
  const [mbaApplications,   setMbaApplications]   = useState(null);
  const [creDelinquencies,  setCreDelinquencies]  = useState(null);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, handleSuccess, handleError, handleFinally, logFetch } = useDataStatus();

  const refetch = useCallback(() => {
    const t0 = Date.now();
    fetchWithRetry(`${SERVER}/api/realEstate`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.reitData?.length) { setReitData(data.reitData); anyReplaced = true; }
        if (data.priceIndexData && Object.keys(data.priceIndexData).length >= 2) {
          setPriceIndexData(prev => ({ ...prev, ...data.priceIndexData }));
          anyReplaced = true;
        }
        if (data.mortgageRates?.rate30y) setMortgageRates(data.mortgageRates);
        if (data.affordabilityData?.current?.medianPrice) { setAffordabilityData(data.affordabilityData); anyReplaced = true; }
        if (data.capRateData?.length >= 3) { setCapRateData(data.capRateData); anyReplaced = true; }
        if (data.caseShillerData?.national?.dates?.length >= 12) setCaseShillerData(data.caseShillerData);
        if (data.supplyData?.housingStarts?.values?.length >= 6) setSupplyData(data.supplyData);
        if (data.homeownershipRate != null) setHomeownershipRate(data.homeownershipRate);
        if (data.rentCpi?.dates?.length >= 6) setRentCpi(data.rentCpi);
        if (data.reitEtf?.price != null) setReitEtf(data.reitEtf);
        if (data.treasury10y != null) setTreasury10y(data.treasury10y);
        if (data.housingStarts?.dates?.length >= 4) setHousingStarts(data.housingStarts);
        if (data.existingHomeSales?.dates?.length >= 4) setExistingHomeSales(data.existingHomeSales);
        if (data.rentalVacancy != null) setRentalVacancy(data.rentalVacancy);
        if (data.medianHomePrice?.dates?.length >= 4) setMedianHomePrice(data.medianHomePrice);
        if (data.foreclosureData?.foreclosures?.values?.length >= 6) setForeclosureData(data.foreclosureData);
        if (data.mbaApplications?.purchase?.values?.length >= 6) setMbaApplications(data.mbaApplications);
        if (data.creDelinquencies?.values?.length >= 4) setCreDelinquencies(data.creDelinquencies);
        if (anyReplaced) handleSuccess(data);
        logFetch({ url: '/api/realEstate', status: 200, duration: Date.now() - t0, sources: { reitData: !!data.reitData?.length, priceIndexData: !!data.priceIndexData, mortgageRates: !!data.mortgageRates, caseShillerData: !!data.caseShillerData, supplyData: !!data.supplyData }, seriesIds: ['CSUSHPISA', 'MORTGAGE30US', 'HOUST', 'PSAVERT', 'WALCL'] });
      })
      .catch((err) => { handleError(err, 'RealEstate'); logFetch({ url: '/api/realEstate', status: 0, duration: Date.now() - t0, error: err?.message || 'Fetch failed' }); })
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { refetch(); }, []);
  useEffect(() => { if (refreshKey > 0) refetch(); }, [refreshKey]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return { priceIndexData, reitData, affordabilityData, capRateData, mortgageRates, caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y, housingStarts, existingHomeSales, rentalVacancy, medianHomePrice, foreclosureData, mbaApplications, creDelinquencies, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent, fetchLog, refetch };
}
