import { useState, useEffect } from 'react';
import {
  priceIndexData   as mockPriceIndexData,
  reitData         as mockReitData,
  affordabilityData,
  capRateData,
} from './mockRealEstateData';

const SERVER = 'http://localhost:3001';

export function useRealEstateData() {
  const [priceIndexData, setPriceIndexData] = useState(mockPriceIndexData);
  const [reitData,       setReitData]       = useState(mockReitData);
  const [isLive,         setIsLive]         = useState(false);
  const [lastUpdated,    setLastUpdated]    = useState('Mock data — Apr 2025');
  const [isLoading,      setIsLoading]      = useState(true);

  useEffect(() => {
    fetch(`${SERVER}/api/realEstate`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.reitData?.length)                     setReitData(data.reitData);
        if (data.priceIndexData && Object.keys(data.priceIndexData).length >= 2) {
          setPriceIndexData(prev => ({ ...prev, ...data.priceIndexData }));
        }
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { priceIndexData, reitData, affordabilityData, capRateData, isLive, lastUpdated, isLoading };
}
