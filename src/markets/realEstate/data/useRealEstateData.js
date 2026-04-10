import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import {
  priceIndexData     as mockPriceIndexData,
  reitData           as mockReitData,
  affordabilityData  as mockAffordabilityData,
  capRateData        as mockCapRateData,
  caseShillerData    as mockCaseShillerData,
  supplyData         as mockSupplyData,
  homeownershipRate  as mockHomeownershipRate,
  rentCpi            as mockRentCpi,
  reitEtf            as mockReitEtf,
  treasury10y        as mockTreasury10y,
  foreclosureData    as mockForeclosureData,
  mbaApplications    as mockMbaApplications,
  creDelinquencies   as mockCreDelinquencies,
} from './mockRealEstateData';

const SERVER = '';

export function useRealEstateData(autoRefresh = false) {
  const [priceIndexData,    setPriceIndexData]    = useState(mockPriceIndexData);
  const [reitData,          setReitData]          = useState(mockReitData);
  const [affordabilityData, setAffordabilityData] = useState(mockAffordabilityData);
  const [capRateData,       setCapRateData]       = useState(mockCapRateData);
  const [mortgageRates,     setMortgageRates]     = useState(null);
  const [caseShillerData,   setCaseShillerData]   = useState(mockCaseShillerData);
  const [supplyData,        setSupplyData]        = useState(mockSupplyData);
  const [homeownershipRate, setHomeownershipRate] = useState(mockHomeownershipRate);
  const [rentCpi,           setRentCpi]           = useState(mockRentCpi);
  const [reitEtf,           setReitEtf]           = useState(mockReitEtf);
  const [treasury10y,       setTreasury10y]       = useState(mockTreasury10y);
  const [housingStarts,     setHousingStarts]     = useState(null);
  const [existingHomeSales, setExistingHomeSales] = useState(null);
  const [rentalVacancy,     setRentalVacancy]     = useState(null);
  const [medianHomePrice,   setMedianHomePrice]   = useState(null);
  const [foreclosureData,   setForeclosureData]   = useState(mockForeclosureData);
  const [mbaApplications,   setMbaApplications]   = useState(mockMbaApplications);
  const [creDelinquencies,  setCreDelinquencies]  = useState(mockCreDelinquencies);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, handleSuccess, handleError, handleFinally } = useDataStatus();

  const refetch = useCallback(() => {
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
      })
      .catch((err) => handleError(err, 'RealEstate'))
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally]);

  useEffect(() => { refetch(); }, [refetch]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return { priceIndexData, reitData, affordabilityData, capRateData, mortgageRates, caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y, housingStarts, existingHomeSales, rentalVacancy, medianHomePrice, foreclosureData, mbaApplications, creDelinquencies, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent };
}
