import { useState, useEffect } from 'react';
import {
  priceIndexData   as mockPriceIndexData,
  reitData         as mockReitData,
  affordabilityData as mockAffordabilityData,
  capRateData      as mockCapRateData,
} from './mockRealEstateData';

const SERVER = '';

export function useRealEstateData() {
  const [priceIndexData,    setPriceIndexData]    = useState(mockPriceIndexData);
  const [reitData,          setReitData]          = useState(mockReitData);
  const [affordabilityData, setAffordabilityData] = useState(mockAffordabilityData);
  const [capRateData,       setCapRateData]       = useState(mockCapRateData);
  const [mortgageRates,     setMortgageRates]     = useState(null);
  const [isLive,            setIsLive]            = useState(false);
  const [lastUpdated,       setLastUpdated]       = useState('Mock data — Apr 2025');
  const [isLoading,         setIsLoading]         = useState(true);
  const [fetchedOn,         setFetchedOn]         = useState(null);
  const [isCurrent,         setIsCurrent]         = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(`${SERVER}/api/realEstate`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
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
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });
  }, []);

  return { priceIndexData, reitData, affordabilityData, capRateData, mortgageRates, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
