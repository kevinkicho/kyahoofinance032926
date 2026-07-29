/** Shared formatters + commodity snapshot for RE dashboard. */
function latestNumber(value, keys = ['values']) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object') return null;
  for (const key of keys) {
    const series = value[key];
    if (Array.isArray(series)) {
      for (let i = series.length - 1; i >= 0; i -= 1) {
        if (typeof series[i] === 'number' && Number.isFinite(series[i])) return series[i];
      }
    }
  }
  return null;
}

/** Western / accounting-style number: 1234567.8 → 1,234,567.8 */
function fmtAcct(v, digits = 0) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtUsdAcct(v, digits = 0) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  const body = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return n < 0 ? `-$${body}` : `$${body}`;
}

function fmtPctAcct(v, digits = 1) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `${fmtAcct(v, digits)}%`;
}

function getCommoditySnapshot(data) {
  if (!data || typeof data !== 'object') return null;
  const futures = data.yahoo?.futures || {};
  const goldPrice = data.gold?.price ?? data.gold ?? data.fred?.gold_am?.value ?? futures['GC=F']?.price ?? null;
  const wtiPrice = data.wti?.price ?? data.wti ?? data.eia?.wti_price?.value ?? data.fred?.wti?.value ?? futures['CL=F']?.price ?? null;
  const natGasPrice = data.natGas?.price ?? data.natGas ?? data.eia?.henry_hub?.value ?? data.eia?.natgas?.value ?? data.fred?.natgas?.value ?? futures['NG=F']?.price ?? null;
  const goldOilRatio = typeof data.goldOilRatio === 'number'
    ? data.goldOilRatio
    : goldPrice != null && wtiPrice
      ? goldPrice / wtiPrice
      : null;

  if (goldPrice == null && wtiPrice == null && natGasPrice == null && goldOilRatio == null) return null;
  return { goldPrice, wtiPrice, natGasPrice, goldOilRatio };
}


export { latestNumber, fmtAcct, fmtUsdAcct, fmtPctAcct, getCommoditySnapshot };
