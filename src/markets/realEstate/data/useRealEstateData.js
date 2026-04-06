import { useState, useEffect } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
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
} from './mockRealEstateData';

const SERVER = '';

export function useRealEstateData() {
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
  const [isLive,            setIsLive]            = useState(false);
  const [lastUpdated,       setLastUpdated]       = useState('Mock data — Apr 2025');
  const [isLoading,         setIsLoading]         = useState(true);
  const [fetchedOn,         setFetchedOn]         = useState(null);
  const [isCurrent,         setIsCurrent]         = useState(false);

  useEffect(() => {
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
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { priceIndexData, reitData, affordabilityData, capRateData, mortgageRates, caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y, housingStarts, existingHomeSales, rentalVacancy, medianHomePrice, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
