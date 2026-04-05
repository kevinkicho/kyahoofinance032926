import { useState, useEffect } from 'react';
import {
  priceIndexData   as mockPriceIndexData,
  reitData         as mockReitData,
  affordabilityData,
  capRateData,
} from './mockRealEstateData';

const SERVER = '';

export function useRealEstateData() {
  const [priceIndexData, setPriceIndexData] = useState(mockPriceIndexData);
  const [reitData,       setReitData]       = useState(mockReitData);
  const [mortgageRates,  setMortgageRates]  = useState(null);
  const [isLive,         setIsLive]         = useState(false);
  const [lastUpdated,    setLastUpdated]    = useState('Mock data — Apr 2025');
  const [isLoading,      setIsLoading]      = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(`${SERVER}/api/realEstate`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.reitData?.length)                     setReitData(data.reitData);
        if (data.priceIndexData && Object.keys(data.priceIndexData).length >= 2) {
          setPriceIndexData(prev => ({ ...prev, ...data.priceIndexData }));
        }
        if (data.mortgageRates?.rate30y) setMortgageRates(data.mortgageRates);
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });
  }, []);

  return { priceIndexData, reitData, affordabilityData, capRateData, mortgageRates, isLive, lastUpdated, isLoading };
}
