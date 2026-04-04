import {
  catBondSpreads,
  combinedRatioData,
  reserveAdequacyData,
  reinsurancePricing,
} from './mockInsuranceData';

export function useInsuranceData() {
  return {
    catBondSpreads,
    combinedRatioData,
    reserveAdequacyData,
    reinsurancePricing,
    isLive: false,
    lastUpdated: 'Mock data — Apr 2025',
  };
}
