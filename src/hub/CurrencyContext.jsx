import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { exchangeRates, currencySymbols } from '../utils/constants';
import { useFrankfurterRates } from '../utils/useFrankfurterRates';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children, initialCurrency = 'USD' }) {
  const [currency, setCurrency] = useState(initialCurrency);
  // Live FX from Frankfurter (ECB data, daily). Independent of DataProvider
  // so CurrencyProvider can sit above DataProvider in the tree without a
  // circular dependency. Falls back to the static `exchangeRates` table on
  // network failure.
  const { rates: liveRates, isLive: ratesLive } = useFrankfurterRates();

  const rates = useMemo(() => liveRates || exchangeRates, [liveRates]);

  const currentRate = rates[currency] || 1;
  const currentSymbol = currencySymbols[currency] || currency;

  const convert = useCallback((value, fromCurrency = 'USD') => {
    if (currency === fromCurrency) return value;
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[currency] || 1;
    return (value / fromRate) * toRate;
  }, [currency, rates]);

  const convertAndFormat = useCallback((value, fromCurrency = 'USD', decimals = 2) => {
    if (value == null) return '—';
    const converted = convert(value, fromCurrency);
    
    let absVal = Math.abs(converted);
    let suffix = '';
    let formatted = converted;

    if (absVal >= 1e12) {
      suffix = 'T';
      formatted = converted / 1e12;
    } else if (absVal >= 1e9) {
      suffix = 'B';
      formatted = converted / 1e9;
    } else if (absVal >= 1e6) {
      suffix = 'M';
      formatted = converted / 1e6;
    } else if (absVal >= 1e3) {
      suffix = 'K';
      formatted = converted / 1e3;
    }

    return `${currentSymbol}${formatted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  }, [convert, currentSymbol]);

  const value = useMemo(() => ({
    currency,
    setCurrency,
    rates,
    symbols: currencySymbols,
    currentRate,
    currentSymbol,
    convert,
    convertAndFormat,
    ratesLive,
  }), [currency, rates, currentRate, currentSymbol, convert, convertAndFormat, ratesLive]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) return { currency: 'USD', setCurrency: () => {}, rates: exchangeRates, symbols: currencySymbols, currentRate: 1, currentSymbol: '$', convert: (v) => v, ratesLive: false };
  return ctx;
}

export default CurrencyContext;