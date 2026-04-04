import { useState, useEffect } from 'react';
import { exchangeRates } from '../../../utils/constants';

const DXY_SYMBOLS = 'EUR,GBP,JPY,CAD,SEK,CHF';
const HISTORY_DAYS = 30;

function getDateStr(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export function useFXData() {
  const fallback = { USD: 1, ...exchangeRates };
  const [spotRates, setSpotRates]     = useState(fallback);
  const [prevRates, setPrevRates]     = useState(fallback);
  const [history, setHistory]         = useState({});
  const [isLive, setIsLive]           = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading]     = useState(true);

  useEffect(() => {
    const today     = getDateStr(0);
    const yesterday = getDateStr(1);
    const startDate = getDateStr(HISTORY_DAYS);

    Promise.all([
      fetch('https://api.frankfurter.dev/v1/latest?base=USD').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`https://api.frankfurter.dev/v1/${yesterday}?base=USD`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`https://api.frankfurter.dev/v1/${startDate}..${today}?base=USD&symbols=${DXY_SYMBOLS}`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    ])
      .then(([latest, prev, hist]) => {
        if (latest?.rates) {
          setSpotRates({ USD: 1, ...latest.rates });
          setIsLive(true);
          setLastUpdated(latest.date || today);
        }
        if (prev?.rates)  setPrevRates({ USD: 1, ...prev.rates });
        if (hist?.rates)  setHistory(hist.rates);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // changes[X] = % change in the USD-based spot rate for X
  // Positive means USD got stronger vs X (X weakened). Negate for "X vs USD" display.
  const changes = Object.keys(spotRates).reduce((acc, code) => {
    if (code === 'USD') return { ...acc, [code]: 0 };
    const prev = prevRates[code] || spotRates[code];
    acc[code] = prev ? ((spotRates[code] - prev) / prev) * 100 : 0;
    return acc;
  }, {});

  return { spotRates, prevRates, changes, history, isLive, lastUpdated, isLoading };
}
