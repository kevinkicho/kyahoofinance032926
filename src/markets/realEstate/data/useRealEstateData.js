import { priceIndexData, reitData, affordabilityData, capRateData } from './mockRealEstateData';

export function useRealEstateData() {
  return {
    priceIndexData,
    reitData,
    affordabilityData,
    capRateData,
    isLive: false,
    lastUpdated: 'Mock data — Apr 2025',
  };
}
