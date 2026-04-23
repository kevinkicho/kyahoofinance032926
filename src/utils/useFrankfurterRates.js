import { useState, useEffect } from 'react';
import { exchangeRates, currencySymbols } from './constants';
import { fetchWithRetry } from './fetchWithRetry';

// Fetches live USD-based exchange rates from Frankfurter (ECB data, updated daily).
// Falls back to the static table in constants.js if the fetch ultimately fails.
export function useFrankfurterRates() {
  const [rates, setRates]           = useState(exchangeRates);
  const [isLive, setIsLive]         = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchWithRetry('https://api.frankfurter.dev/v1/latest?base=USD', {
      retries: 2,
      timeout: 8000,
      backoff: 1000,
      totalTimeout: 20000,
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (!data || typeof data !== 'object') {
          console.error('[Frankfurter] Invalid response: not an object');
          return;
        }
        if (!data.rates || typeof data.rates !== 'object') {
          console.error('[Frankfurter] Invalid response: missing rates');
          return;
        }
        setRates({ USD: 1, ...data.rates });
        setIsLive(true);
        setLastUpdated(data.date ? `${data.date} 00:00:00 UTC` : (() => {
          const d = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        })());
      })
      .catch(e => { if (!cancelled) console.error('[Frankfurter] Fetch failed after retries:', e?.message || e); });
    return () => { cancelled = true; };
  }, []);

  return { rates, symbols: currencySymbols, isLive, lastUpdated };
}
