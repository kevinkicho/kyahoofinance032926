import { yieldCurveData, creditRatingsData, spreadData, durationLadderData } from './mockBondsData';

export function useBondsData() {
  return {
    yieldCurveData,
    creditRatingsData,
    spreadData,
    durationLadderData,
    isLive: false,
    lastUpdated: 'Mock data — Apr 2025',
  };
}
