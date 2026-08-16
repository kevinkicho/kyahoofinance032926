/** Live-chip predicates for equities tiles that can paint empty / dashes. */

const FUND_SERIES = [
  'revenues',
  'netIncome',
  'assets',
  'liabilities',
  'equity',
  'operatingIncome',
  'cashFlow',
  'capex',
  'rdExpense',
  'interestExpense',
  'currentAssets',
  'currentLiabilities',
];

function latestNumeric(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  const raw = arr.at(-1)?.value;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function hasFilingRow(f) {
  return !!(f && (f.form || f.date || f.accession));
}

/** SEC fundamentals tile is empty when isLive/tickers exist but no XBRL number paints. */
export function hasSecFundamentalsRows(data) {
  const tickers = data?.tickers;
  if (!tickers || typeof tickers !== 'object' || Array.isArray(tickers)) return false;
  return Object.values(tickers).some((row) => {
    if (!row || typeof row !== 'object') return false;
    return FUND_SERIES.some((k) => latestNumeric(row[k]) != null);
  });
}

/** SEC filing-activity tile is empty when isLive/total exist but no filing list paints. */
export function hasSecFilingActivity(data) {
  if (!data || typeof data !== 'object') return false;
  const byTicker = data.byTicker;
  if (byTicker && typeof byTicker === 'object') {
    for (const list of Object.values(byTicker)) {
      if (Array.isArray(list) && list.some(hasFilingRow)) return true;
    }
  }
  return ['material', 'insider', 'earnings', 'activist'].some(
    (k) => Array.isArray(data[k]) && data[k].some(hasFilingRow),
  );
}