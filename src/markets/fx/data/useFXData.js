import { useState, useEffect } from 'react';
import { exchangeRates } from '../../../utils/constants';

const DXY_SYMBOLS = 'EUR,GBP,JPY,CAD,SEK,CHF';
const MOVER_SYMBOLS = 'EUR,GBP,JPY,CNY,CHF,AUD,CAD,SEK,NOK,NZD,HKD,SGD,INR,KRW,MXN,BRL,ZAR';
const HISTORY_DAYS = 30;

function getDateStr(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export function useFXData() {
  const fallback = { USD: 1, ...exchangeRates };
  const [spotRates,   setSpotRates]   = useState(fallback);
  const [prevRates,   setPrevRates]   = useState(fallback);
  const [history,     setHistory]     = useState({});
  const [changes1w,   setChanges1w]   = useState({});
  const [changes1m,   setChanges1m]   = useState({});
  const [sparklines,  setSparklines]  = useState({});
  const [isLive,      setIsLive]      = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    const today     = getDateStr(0);
    const yesterday = getDateStr(1);
    const startDate = getDateStr(HISTORY_DAYS);
    const sevenAgo  = getDateStr(7);
    const thirtyAgo = getDateStr(HISTORY_DAYS);

    Promise.all([
      fetch('https://api.frankfurter.dev/v1/latest?base=USD')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`https://api.frankfurter.dev/v1/${yesterday}?base=USD`)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`https://api.frankfurter.dev/v1/${startDate}..${today}?base=USD&symbols=${DXY_SYMBOLS}`)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`https://api.frankfurter.dev/v1/${sevenAgo}..${today}?base=USD&symbols=${MOVER_SYMBOLS}`)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`https://api.frankfurter.dev/v1/${thirtyAgo}?base=USD&symbols=${MOVER_SYMBOLS}`)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    ])
      .then(([latest, prev, hist, weekHist, month30]) => {
        let spot = fallback;
        if (latest?.rates) {
          spot = { USD: 1, ...latest.rates };
          setSpotRates(spot);
          setIsLive(true);
          setLastUpdated(latest.date || today);
        }
        if (prev?.rates)  setPrevRates({ USD: 1, ...prev.rates });
        if (hist?.rates)  setHistory(hist.rates);

        // 1W changes and sparklines from 7-day range
        if (weekHist?.rates) {
          const sortedDates = Object.keys(weekHist.rates).sort();
          if (sortedDates.length >= 2) {
            const firstRates = weekHist.rates[sortedDates[0]];
            const lastRates  = weekHist.rates[sortedDates[sortedDates.length - 1]];
            const w = {};
            const sparks = {};
            Object.keys(lastRates).forEach(code => {
              const base = firstRates[code];
              if (!base) return;
              w[code] = -((lastRates[code] - base) / base * 100);
              sparks[code] = sortedDates
                .map(d => {
                  const rate = weekHist.rates[d]?.[code];
                  return rate != null ? (-((rate - base) / base * 100) || 0) : null;
                })
                .filter(v => v != null);
            });
            setChanges1w(w);
            setSparklines(sparks);
          }
        }

        // 1M changes from 30-day single-date snapshot
        if (month30?.rates) {
          const m = {};
          Object.keys(spot).forEach(code => {
            if (code === 'USD') return;
            const prev30 = month30.rates[code] || spot[code];
            if (prev30) m[code] = -((spot[code] - prev30) / prev30 * 100);
          });
          setChanges1m(m);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // 24h changes: positive = currency strengthened vs USD
  const changes = Object.keys(spotRates).reduce((acc, code) => {
    if (code === 'USD') return { ...acc, [code]: 0 };
    const prev = prevRates[code] || spotRates[code];
    acc[code] = prev ? -((spotRates[code] - prev) / prev * 100) : 0;
    return acc;
  }, {});

  return { spotRates, prevRates, changes, changes1w, changes1m, sparklines, history, isLive, lastUpdated, isLoading };
}
