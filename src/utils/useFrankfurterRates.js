import { useState, useEffect } from 'react';
import { exchangeRates, currencySymbols } from './constants';

// Fetches live USD-based exchange rates from Frankfurter (ECB data, updated daily)
// Falls back to static constants if the fetch fails
export function useFrankfurterRates() {
  const [rates, setRates]           = useState(exchangeRates);   // start with static fallback
  const [isLive, setIsLive]         = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetch('https://api.frankfurter.dev/v1/latest?base=USD')
      .then(r => r.json())
      .then(data => {
        if (data?.rates) {
          setRates({ USD: 1, ...data.rates });
          setIsLive(true);
          setLastUpdated(data.date || new Date().toISOString().split('T')[0]);
        }
      })
      .catch(() => { /* silently keep static fallback */ });
  }, []);

  return { rates, symbols: currencySymbols, isLive, lastUpdated };
}
