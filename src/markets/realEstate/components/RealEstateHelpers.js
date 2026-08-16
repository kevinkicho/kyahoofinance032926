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


/** National Case-Shiller dates the shiller tile charts. */
function hasShillerSeries(caseShillerData) {
  const d = caseShillerData?.national || caseShillerData;
  return Array.isArray(d?.dates) && d.dates.length > 0;
}

function hasReitPerfRows(reitData) {
  return Array.isArray(reitData) && reitData.length > 0;
}

function hasCapRateRows(capRateData) {
  return Array.isArray(capRateData) && capRateData.length > 0;
}

/** Affordability stack paints 5 cards; live only when at least one metric is numeric. */
function hasAffordabilityStackMetrics(stack) {
  if (!stack || typeof stack !== 'object' || Array.isArray(stack)) return false;
  return [stack.price, stack.rate, stack.payment, stack.hudMedianIncome, stack.annualBurden]
    .some((v) => typeof v === 'number' && Number.isFinite(v));
}

function hasSupplyMetrics(supplyData) {
  if (!supplyData || typeof supplyData !== 'object') return false;
  if (Array.isArray(supplyData.housingStarts?.values) && supplyData.housingStarts.values.length > 0) return true;
  if (Array.isArray(supplyData.permits?.values) && supplyData.permits.values.length > 0) return true;
  if (typeof supplyData.monthsSupply === 'number' && Number.isFinite(supplyData.monthsSupply)) return true;
  if (supplyData.activeListings != null) return true;
  return false;
}

function hasFhfaHpiSeries(fhfaHpi) {
  return Array.isArray(fhfaHpi?.dates) && fhfaHpi.dates.length > 0;
}

function hasReitEtfHistory(reitEtf) {
  return Array.isArray(reitEtf?.history?.dates) && reitEtf.history.dates.length > 0;
}

function hasForeclosureSeries(foreclosureData) {
  if (Array.isArray(foreclosureData?.foreclosures?.values) && foreclosureData.foreclosures.values.length > 0) return true;
  if (Array.isArray(foreclosureData?.delinquencies?.values) && foreclosureData.delinquencies.values.length > 0) return true;
  return false;
}

function hasMbaApplications(mbaApplications) {
  return Array.isArray(mbaApplications?.purchase?.values) && mbaApplications.purchase.values.length > 0;
}

function hasCreDelinquencies(creDelinquencies) {
  return Array.isArray(creDelinquencies?.values) && creDelinquencies.values.length > 0;
}

export {
  latestNumber, fmtAcct, fmtUsdAcct, fmtPctAcct, getCommoditySnapshot,
  hasShillerSeries, hasReitPerfRows, hasCapRateRows, hasAffordabilityStackMetrics,
  hasSupplyMetrics, hasFhfaHpiSeries,
  hasReitEtfHistory, hasForeclosureSeries, hasMbaApplications, hasCreDelinquencies,
};

