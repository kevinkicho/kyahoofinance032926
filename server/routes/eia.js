import { Router } from 'express';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const EIA_API_BASE = 'https://api.eia.gov/v2';
const API_KEY = () => process.env.EIA_API_KEY;

const EIA_QUERIES = {
  elecResidential: {
    path: '/electricity/retail-sales/data',
    params: 'frequency=monthly&data[0]=sales&data[1]=revenue&data[2]=price&facets[sectorid][]=RES&facets[stateid][]=US&sort[0][column]=period&sort[0][direction]=desc&length=36',
    label: 'Electricity · Residential',
  },
  elecCommercial: {
    path: '/electricity/retail-sales/data',
    params: 'frequency=monthly&data[0]=sales&data[1]=revenue&data[2]=price&facets[sectorid][]=COM&facets[stateid][]=US&sort[0][column]=period&sort[0][direction]=desc&length=36',
    label: 'Electricity · Commercial',
  },
  elecIndustrial: {
    path: '/electricity/retail-sales/data',
    params: 'frequency=monthly&data[0]=sales&data[1]=revenue&data[2]=price&facets[sectorid][]=IND&facets[stateid][]=US&sort[0][column]=period&sort[0][direction]=desc&length=36',
    label: 'Electricity · Industrial',
  },
  co2Total: {
    path: '/co2-emissions/co2-emissions-aggregates/data',
    params: 'frequency=annual&data[0]=value&facets[fuelId][]=TO&facets[stateId][]=US&facets[sectorId][]=TT&sort[0][column]=period&sort[0][direction]=desc&length=10',
    label: 'CO₂ Emissions · Total',
  },
  co2BySector: {
    path: '/co2-emissions/co2-emissions-aggregates/data',
    params: 'frequency=annual&data[0]=value&facets[fuelId][]=TO&facets[stateId][]=US&sort[0][column]=period&sort[0][direction]=desc&length=10',
    label: 'CO₂ Emissions · By Sector',
  },
};

async function fetchEIASeries(queryKey) {
  const q = EIA_QUERIES[queryKey];
  const apiKey = API_KEY();
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    trackApiCall('EIA');
    const url = `${EIA_API_BASE}${q.path}?${q.params}&api_key=${apiKey}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[EIA] ${queryKey}: upstream ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.response?.data || [];
  } catch (err) {
    clearTimeout(timeout);
    console.warn(`[EIA] ${queryKey}: ${err.message}`);
    return null;
  }
}

function parseElecData(rawRows) {
  if (!rawRows?.length) return null;
  const dates = [];
  const sales = [];
  const revenue = [];
  const price = [];
  for (const row of rawRows) {
    if (row.period && row.sales && row.price) {
      dates.push(row.period);
      sales.push(parseFloat(row.sales));
      revenue.push(parseFloat(row.revenue));
      price.push(parseFloat(row.price));
    }
  }
  if (dates.length === 0) return null;
  return {
    dates,
    sales: { values: sales, unit: rawRows[0]['sales-units'] || 'M kWh' },
    revenue: { values: revenue, unit: rawRows[0]['revenue-units'] || 'M$' },
    price: { values: price, unit: rawRows[0]['price-units'] || 'cents/kWh' },
    latest: { period: dates[0], sales: sales[0], revenue: revenue[0], price: price[0] },
    previous: dates.length > 1 ? { period: dates[1], sales: sales[1], revenue: revenue[1], price: price[1] } : null,
  };
}

function parseCO2Data(rawRows) {
  if (!rawRows?.length) return null;
  const bySector = {};
  for (const row of rawRows) {
    const sector = row['sector-name'] || row.sectorId;
    if (!bySector[sector]) bySector[sector] = [];
    bySector[sector].push({ period: row.period, value: parseFloat(row.value), unit: row['value-units'] });
  }
  const allSectors = Object.entries(bySector).map(([name, entries]) => {
    entries.sort((a, b) => b.period.localeCompare(a.period));
    return { name, latest: entries[0]?.value || 0, unit: entries[0]?.unit || 'MMT CO₂', period: entries[0]?.period, history: entries.slice(0, 10) };
  });
  return allSectors.length > 0 ? allSectors : null;
}

router.get('/', async (req, res) => {
  const apiKey = API_KEY();
  if (!apiKey) {
    return res.status(503).json({ error: 'EIA_API_KEY not configured' });
  }

  const today = todayStr();
  const daily = readDailyCache('eia');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cacheKey = 'eia_data';
  const cached = req.app.locals.cache?.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    const elecResults = await Promise.allSettled([
      fetchEIASeries('elecResidential'),
      fetchEIASeries('elecCommercial'),
      fetchEIASeries('elecIndustrial'),
    ]);

    const co2Results = await Promise.allSettled([
      fetchEIASeries('co2Total'),
      fetchEIASeries('co2BySector'),
    ]);

    const electricity = {
      residential: parseElecData(elecResults[0].status === 'fulfilled' ? elecResults[0].value : null),
      commercial: parseElecData(elecResults[1].status === 'fulfilled' ? elecResults[1].value : null),
      industrial: parseElecData(elecResults[2].status === 'fulfilled' ? elecResults[2].value : null),
    };

    const co2Emissions = {
      total: parseCO2Data(co2Results[0].status === 'fulfilled' ? co2Results[0].value : null),
      bySector: parseCO2Data(co2Results[1].status === 'fulfilled' ? co2Results[1].value : null),
    };

    const _sources = {};
    _sources.eia_elecResidential = electricity.residential != null;
    _sources.eia_elecCommercial = electricity.commercial != null;
    _sources.eia_elecIndustrial = electricity.industrial != null;
    _sources.eia_co2Total = co2Emissions.total != null;
    _sources.eia_co2BySector = co2Emissions.bySector != null;

    const anySourceLive = Object.values(_sources).some(v => v === true);

    const result = {
      electricity,
      co2Emissions,
      _sources,
      lastUpdated: today,
    };

    if (anySourceLive) writeDailyCache('eia', result);
    req.app.locals.cache?.set(cacheKey, result, 3600);
    res.json({ ...result, fetchedOn: today, isCurrent: anySourceLive });
  } catch (err) {
    console.error('[EIA] route error:', err);
    const fallback = readLatestCache('eia');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;