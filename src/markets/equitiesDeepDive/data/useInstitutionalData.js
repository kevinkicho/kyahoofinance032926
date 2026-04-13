import { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';

const SERVER = '';

const EMPTY_DATA = {
  lastUpdated: null,
  institutions: [],
  aggregateTopHoldings: [],
  recentChanges: { lastQuarter: null, bigBuys: [], bigSells: [], newPositions: [] },
};

export function useInstitutionalData(autoRefresh = false, refreshKey = 0) {
  const [data, setData] = useState(EMPTY_DATA);

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, handleSuccess, handleError, handleFinally, logFetch } = useDataStatus();

  const refetch = useCallback(() => {
    const t0 = Date.now();
    fetchWithRetry(`${SERVER}/api/institutional`)
      .then(r => r.json())
      .then(d => {
        if (d.institutions?.length >= 3) {
          setData(d);
          handleSuccess(d);
        }
        logFetch({ url: '/api/institutional', status: 200, duration: Date.now() - t0, sources: { institutions: !!d.institutions?.length }, seriesIds: [] });
      })
      .catch((err) => { handleError(err, 'Institutional'); logFetch({ url: '/api/institutional', status: 0, duration: Date.now() - t0, error: err?.message || 'Fetch failed' }); })
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally, logFetch]);

  useEffect(() => { refetch(); }, []);
  useEffect(() => { if (refreshKey > 0) refetch(); }, [refreshKey]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  return { ...data, isLive, lastUpdated, isLoading, error, fetchedOn, isCurrent, fetchLog, refetch };
}