import { useState, useCallback } from 'react';

function tsNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function useDataStatus(initialLastUpdated = 'Mock data — Apr 2025') {
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(initialLastUpdated);
  const [fetchedOn, setFetchedOn] = useState(null);
  const [isCurrent, setIsCurrent] = useState(false);
  const [fetchLog, setFetchLog] = useState([]);

  const appendLog = useCallback((entry) => {
    setFetchLog(prev => [entry, ...prev].slice(0, 20));
  }, []);

  const handleSuccess = useCallback((data) => {
    setIsLive(true);
    setError(null);
    let ts = data?.lastUpdated || tsNow();
    if (/^\d{4}-\d{2}-\d{2}$/.test(ts)) {
      ts = `${ts} ${new Date().toTimeString().slice(0, 8)}`;
    }
    setLastUpdated(ts);
    let fo = data?.fetchedOn;
    if (fo && /^\d{4}-\d{2}-\d{2}$/.test(fo)) {
      fo = `${fo} ${new Date().toTimeString().slice(0, 8)}`;
    }
    if (fo) setFetchedOn(fo);
    if (data?.isCurrent !== undefined) setIsCurrent(!!data.isCurrent);
  }, []);

  const handleError = useCallback((err, context = 'Data fetch') => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[${context}]`, err?.message || err);
    }
    setError(err?.message || 'Failed to fetch data');
    setIsLive(false);
  }, []);

  const handleFinally = useCallback(() => {
    setIsLoading(false);
  }, []);

  const logFetch = useCallback(({ url, status, duration, error, sources, seriesIds }) => {
    appendLog({
      time: tsNow(),
      url: url || '/api/bonds',
      status,
      duration: duration != null ? `${duration}ms` : '\u2014',
      error: error || null,
      sources: sources || null,
      seriesIds: seriesIds || null,
    });
  }, [appendLog]);

  return {
    isLive,
    isLoading,
    error,
    lastUpdated,
    fetchedOn,
    isCurrent,
    fetchLog,
    setIsLive,
    setIsLoading,
    setError,
    setLastUpdated,
    setFetchedOn,
    handleSuccess,
    handleError,
    handleFinally,
    logFetch,
  };
}