import { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData } from './mockDerivativesData';

export function useDerivativesData() {
  return {
    volSurfaceData,
    vixTermStructure,
    optionsFlow,
    fearGreedData,
    isLive: false,
    lastUpdated: 'Mock data — Apr 2025',
  };
}
