import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import { reitData as mockReit, priceIndexData as mockPriceIndex, affordabilityData as mockAffordability, capRateData as mockCapRate, caseShillerData as mockCaseShiller, supplyData as mockSupply, homeownershipRate as mockHomeownership, rentCpi as mockRentCpi, reitEtf as mockReitEtf, treasury10y as mockTreasury10y, foreclosureData as mockForeclosure, mbaApplications as mockMba, creDelinquencies as mockCreDel } from './mockRealEstateData';

const SERVER = '';

export function useRealEstateData(autoRefresh = false, refreshKey = 0, { disabled = false } = {}) {
  const [priceIndexData,    setPriceIndexData]    = useState(mockPriceIndex);
  const [reitData,          setReitData]          = useState(mockReit);
  const [affordabilityData, setAffordabilityData] = useState(mockAffordability);
  const [capRateData,       setCapRateData]       = useState(mockCapRate);
  const [mortgageRates,     setMortgageRates]     = useState(null);
  const [caseShillerData,   setCaseShillerData]   = useState(mockCaseShiller);
  const [supplyData,        setSupplyData]        = useState(mockSupply);
  const [homeownershipRate, setHomeownershipRate] = useState(mockHomeownership);
  const [rentCpi,           setRentCpi]           = useState(mockRentCpi);
  const [reitEtf,           setReitEtf]           = useState(mockReitEtf);
  const [treasury10y,       setTreasury10y]       = useState(mockTreasury10y);
  const [housingStarts,     setHousingStarts]     = useState(null);
  const [existingHomeSales, setExistingHomeSales] = useState(null);
  const [rentalVacancy,     setRentalVacancy]     = useState(null);
  const [medianHomePrice,   setMedianHomePrice]   = useState(null);
  const [foreclosureData,   setForeclosureData]   = useState(mockForeclosure);
  const [mbaApplications,   setMbaApplications]   = useState(mockMba);
  const [creDelinquencies,  setCreDelinquencies]  = useState(mockCreDel);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, handleSuccess, handleError, handleFinally, logFetch } = useDataStatus();

  const refetch = useCallback(() => {
    const t0 = Date.now();
    fetchWithRetry(`${SERVER}/api/realEstate`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.reitData?.length) { setReitData(data.reitData); anyReplaced = true; }
        if (data.priceIndexData && Object.keys(data.priceIndexData).length) {
          setPriceIndexData(prev => ({ ...prev, ...data.priceIndexData }));
          anyReplaced = true;
        }
        if (data.mortgageRates?.rate30y) setMortgageRates(data.mortgageRates);
        if (data.affordabilityData?.current?.medianPrice) { setAffordabilityData(data.affordabilityData); anyReplaced = true; }
        if (data.capRateData?.length) { setCapRateData(data.capRateData); anyReplaced = true; }
        if (data.caseShillerData?.national?.dates?.length) setCaseShillerData(data.caseShillerData);
        if (data.supplyData?.housingStarts?.values?.length) setSupplyData(data.supplyData);
        if (data.homeownershipRate != null) setHomeownershipRate(data.homeownershipRate);
        if (data.rentCpi?.dates?.length) setRentCpi(data.rentCpi);
        if (data.reitEtf?.price != null) setReitEtf(data.reitEtf);
        if (data.treasury10y != null) setTreasury10y(data.treasury10y);
        if (data.housingStarts?.dates?.length) setHousingStarts(data.housingStarts);
        if (data.existingHomeSales?.dates?.length) setExistingHomeSales(data.existingHomeSales);
        if (data.rentalVacancy != null) setRentalVacancy(data.rentalVacancy);
        if (data.medianHomePrice?.dates?.length) setMedianHomePrice(data.medianHomePrice);
        if (data.foreclosureData?.foreclosures?.values?.length) setForeclosureData(data.foreclosureData);
        if (data.mbaApplications?.purchase?.values?.length) setMbaApplications(data.mbaApplications);
        if (data.creDelinquencies?.values?.length) setCreDelinquencies(data.creDelinquencies);
        if (anyReplaced) handleSuccess(data);
        logFetch({ url: '/api/realEstate', status: 200, duration: Date.now() - t0, sources: { reitData: !!data.reitData?.length, priceIndexData: !!data.priceIndexData, mortgageRates: !!data.mortgageRates, caseShillerData: !!data.caseShillerData, supplyData: !!data.supplyData }, seriesIds: ['CSUSHPISA', 'MORTGAGE30US', 'HOUST', 'PSAVERT', 'WALCL'] });
      })
      .catch((err) => { handleError(err, 'RealEstate'); logFetch({ url: '/api/realEstate', status: 0, duration: Date.now() - t0, error: err?.message || 'Fetch failed' }); })
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { if (!disabled) refetch(); }, [disabled]);
  useEffect(() => { if (refreshKey > 0 && !disabled) refetch(); }, [refreshKey, disabled]);

  useInterval(refetch, (!disabled && autoRefresh) ? 300000 : null);

  return { priceIndexData, reitData, affordabilityData, capRateData, mortgageRates, caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y, housingStarts, existingHomeSales, rentalVacancy, medianHomePrice, foreclosureData, mbaApplications, creDelinquencies, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent, fetchLog, refetch };
}
