// src/hooks/useDataStatus.js
/**
 * Shared hook for managing data fetch status (loading, error, live status).
 * Reduces boilerplate across all market data hooks.
 */
import { useState, useCallback } from 'react';

/**
 * Standard status state for data fetching hooks
 * @returns {Object} Status state and control functions
 */
export function useDataStatus(initialLastUpdated = 'Mock data — Apr 2025') {
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(initialLastUpdated);
  const [fetchedOn, setFetchedOn] = useState(null);
  const [isCurrent, setIsCurrent] = useState(false);

  const handleSuccess = useCallback((data) => {
    setIsLive(true);
    setError(null);
    setLastUpdated(data?.lastUpdated || new Date().toISOString().split('T')[0]);
    if (data?.fetchedOn) setFetchedOn(data.fetchedOn);
    if (data?.isCurrent !== undefined) setIsCurrent(!!data.isCurrent);
  }, []);

  const handleError = useCallback((err, context = 'Data fetch') => {
    // Log error for debugging (can be filtered in production)
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[${context}]`, err?.message || err);
    }
    setError(err?.message || 'Failed to fetch data');
    setIsLive(false);
  }, []);

  const handleFinally = useCallback(() => {
    setIsLoading(false);
  }, []);

  return {
    // State
    isLive,
    isLoading,
    error,
    lastUpdated,
    fetchedOn,
    isCurrent,
    // Setters for edge cases
    setIsLive,
    setIsLoading,
    setError,
    setLastUpdated,
    // Action handlers
    handleSuccess,
    handleError,
    handleFinally,
  };
}

/**
 * Standard status return object shape for data hooks
 * @typedef {Object} DataStatus
 * @property {boolean} isLive - Whether live data was fetched successfully
 * @property {boolean} isLoading - Whether data is currently being fetched
 * @property {string|null} error - Error message if fetch failed, null otherwise
 * @property {string} lastUpdated - Timestamp of last successful update
 * @property {string|null} fetchedOn - Server-side fetch timestamp
 * @property {boolean} isCurrent - Whether data is from current trading session
 */