import { useState, useEffect } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useDataStatus } from '../../../hooks/useDataStatus';

const CFTC_URL =
  'https://publicreporting.cftc.gov/resource/jun7-fc8e.json' +
  '?$select=report_date_as_yyyy_mm_dd,market_and_exchange_names,' +
  'noncomm_positions_long_all,noncomm_positions_short_all,open_interest_all' +
  '&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=6';

const NAME_MAP = {
  EUR: 'EURO FX',
  JPY: 'JAPANESE YEN',
  GBP: 'BRITISH POUND',
  CAD: 'CANADIAN DOLLAR',
  CHF: 'SWISS FRANC',
  AUD: 'AUSTRALIAN DOLLAR',
};

export function useCOTData() {
  const [cotData,   setCotData]   = useState({});

  // Status with error handling
  const { isLive, isLoading, error, handleSuccess, handleError, handleFinally } = useDataStatus();

  useEffect(() => {
    fetchWithRetry(CFTC_URL)
      .then(r => r.json())
      .then(rows => {
        const result = {};
        Object.entries(NAME_MAP).forEach(([code, needle]) => {
          const row = rows.find(r => r.market_and_exchange_names?.includes(needle));
          if (row) {
            const long  = parseFloat(row.noncomm_positions_long_all)  || 0;
            const short = parseFloat(row.noncomm_positions_short_all) || 0;
            const oi    = parseFloat(row.open_interest_all) || 1;
            result[code] = Math.round((long - short) / oi * 100 * 10) / 10;
          }
        });
        setCotData(result);
        handleSuccess({});
      })
      .catch((err) => handleError(err, 'COT'))
      .finally(() => handleFinally());
  }, [handleSuccess, handleError, handleFinally]);

  return { cotData, isLive, isLoading, error };
}
