import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';

const SERVER = '';

const MOCK_DATA = {
  lastUpdated: '2024-Q4',
  institutions: [
    {
      name: 'Berkshire Hathaway',
      ticker: 'BRK.A',
      totalValue: 315.2,
      topHoldings: [
        { ticker: 'AAPL', name: 'Apple Inc.', shares: 915.56, value: 174.3, pctOfPortfolio: 55.3 },
        { ticker: 'BAC', name: 'Bank of America', shares: 1047.65, value: 41.2, pctOfPortfolio: 13.1 },
        { ticker: 'AMZN', name: 'Amazon.com', shares: 12.89, value: 23.8, pctOfPortfolio: 7.5 },
        { ticker: 'KO', name: 'Coca-Cola', shares: 400.00, value: 23.5, pctOfPortfolio: 7.5 },
        { ticker: 'AXP', name: 'American Express', shares: 151.61, value: 21.8, pctOfPortfolio: 6.9 },
      ],
    },
    {
      name: 'BlackRock',
      ticker: 'BLK',
      totalValue: 4500,
      topHoldings: [
        { ticker: 'AAPL', name: 'Apple Inc.', shares: 1320.5, value: 251.2, pctOfPortfolio: 5.6 },
        { ticker: 'MSFT', name: 'Microsoft', shares: 425.3, value: 178.5, pctOfPortfolio: 4.0 },
        { ticker: 'NVDA', name: 'NVIDIA', shares: 196.8, value: 156.2, pctOfPortfolio: 3.5 },
      ],
    },
    {
      name: 'Vanguard Group',
      ticker: 'Vanguard',
      totalValue: 8500,
      topHoldings: [
        { ticker: 'AAPL', name: 'Apple Inc.', shares: 1450.2, value: 276.1, pctOfPortfolio: 3.2 },
        { ticker: 'MSFT', name: 'Microsoft', shares: 485.6, value: 203.9, pctOfPortfolio: 2.4 },
        { ticker: 'NVDA', name: 'NVIDIA', shares: 225.3, value: 178.9, pctOfPortfolio: 2.1 },
      ],
    },
  ],
  aggregateTopHoldings: [
    { ticker: 'AAPL', name: 'Apple Inc.', holders: 5, totalShares: 5747.1, totalValue: 1093.8 },
    { ticker: 'MSFT', name: 'Microsoft', holders: 5, totalShares: 1714.9, totalValue: 720.0 },
    { ticker: 'NVDA', name: 'NVIDIA', holders: 5, totalShares: 782.2, totalValue: 621.0 },
    { ticker: 'AMZN', name: 'Amazon.com', holders: 5, totalShares: 1594.5, totalValue: 338.3 },
  ],
  recentChanges: {
    lastQuarter: '2024-Q4',
    bigBuys: [
      { ticker: 'OXY', name: 'Occidental Petroleum', buyer: 'Berkshire Hathaway', shares: '248.5M', thesis: 'Energy sector bet' },
    ],
    bigSells: [],
    newPositions: [],
  },
};

export function useInstitutionalData(autoRefresh = false) {
  const [data, setData] = useState(MOCK_DATA);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, handleSuccess, handleError, handleFinally } = useDataStatus();

  const refetch = useCallback(() => {
    fetchWithRetry(`${SERVER}/api/institutional`)
      .then(r => r.json())
      .then(d => {
        if (d.institutions?.length >= 3) {
          setData(d);
          handleSuccess(d);
        }
      })
      .catch((err) => handleError(err, 'Institutional'))
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally]);

  useEffect(() => { refetch(); }, [refetch]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return { ...data, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent };
}