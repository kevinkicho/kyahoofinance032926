import { createContext, useContext } from 'react';

const DataContext = createContext(null);

export function useDataContext() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataContext must be used within DataProvider');
  return ctx;
}

export function useMarketData(marketId) {
  const ctx = useContext(DataContext);
  if (!ctx) return { isLoading: true, isLive: false };
  return ctx.getMarket(marketId);
}

export default DataContext;