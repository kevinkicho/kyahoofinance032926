import { Router } from 'express';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const EIA_API_BASE = 'https://api.eia.gov/v2';
const API_KEY = () => (process.env.EIA_API_KEY || '').trim();

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
  petroleumWTI: {
    path: '/petroleum/pri/spt/data',
    params: 'frequency=monthly&data[0]=value&facets[series][]=RWTC&sort[0][column]=period&sort[0][direction]=desc&length=36',
    label: 'Crude Oil · WTI Spot',
  },
  petroleumBrent: {
    path: '/petroleum/pri/spt/data',
    params: 'frequency=monthly&data[0]=value&facets[series][]=RBRTE&sort[0][column]=period&sort[0][direction]=desc&length=36',
    label: 'Crude Oil · Brent Spot',
  },
  petroleumGasoline: {
    path: '/petroleum/pri/gnd/data',
    params: 'frequency=weekly&data[0]=value&facets[series][]=EER_EPMRU_PF4_RGC_DPG&sort[0][column]=period&sort[0][direction]=desc&length=52',
    label: 'Gasoline · Regular Conventional',
  },
  petroleumDiesel: {
    path: '/petroleum/pri/gnd/data',
    params: 'frequency=weekly&data[0]=value&facets[series][]=EER_EPD2DXL0_PF4_RGC_DPG&sort[0][column]=period&sort[0][direction]=desc&length=52',
    label: 'Diesel · Ultra-Low Sulfur',
  },
  petroleumHeatingOil: {
    path: '/petroleum/pri/spt/data',
    params: 'frequency=monthly&data[0]=value&facets[series][]=EER_EPD2F_PF4_Y35NY_DPG&sort[0][column]=period&sort[0][direction]=desc&length=36',
    label: 'Heating Oil · NY Harbor',
  },
  naturalGasHenryHub: {
    path: '/natural-gas/pri/fut/data',
    params: 'frequency=weekly&data[0]=value&facets[series][]=RNGWHHD&sort[0][column]=period&sort[0][direction]=desc&length=52',
    label: 'Natural Gas · Henry Hub Spot',
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

function parsePriceSeries(rawRows, { unit: defaultUnit = '', label: defaultLabel = '' } = {}) {
  if (!rawRows?.length) return null;
  const dates = [];
  const values = [];
  for (const row of rawRows) {
    if (row.period && row.value != null) {
      dates.push(row.period);
      values.push(parseFloat(row.value));
    }
  }
  if (dates.length === 0) return null;
  return {
    dates,
    values,
    unit: rawRows[0].units || defaultUnit,
    label: rawRows[0]['series-description'] || defaultLabel,
    latest: { period: dates[0], value: values[0] },
    previous: dates.length > 1 ? { period: dates[1], value: values[1] } : null,
  };
}

router.get('/', async (req, res) => {
  const apiKey = API_KEY();
  if (!apiKey) {
    return res.json({
      electricity: { residential: null, commercial: null, industrial: null },
      co2Emissions: { total: null, bySector: null },
      petroleum: { wti: null, brent: null, gasoline: null, diesel: null, heatingOil: null },
      naturalGas: { henryHub: null },
      _sources: { eia: false },
      lastUpdated: todayStr(),
      fetchedOn: todayStr(),
      isCurrent: false,
    });
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

    const petroleumResults = await Promise.allSettled([
      fetchEIASeries('petroleumWTI'),
      fetchEIASeries('petroleumBrent'),
      fetchEIASeries('petroleumGasoline'),
      fetchEIASeries('petroleumDiesel'),
      fetchEIASeries('petroleumHeatingOil'),
    ]);

    const ngResults = await Promise.allSettled([
      fetchEIASeries('naturalGasHenryHub'),
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

    const petroleum = {
      wti: parsePriceSeries(petroleumResults[0].status === 'fulfilled' ? petroleumResults[0].value : null),
      brent: parsePriceSeries(petroleumResults[1].status === 'fulfilled' ? petroleumResults[1].value : null),
      gasoline: parsePriceSeries(petroleumResults[2].status === 'fulfilled' ? petroleumResults[2].value : null),
      diesel: parsePriceSeries(petroleumResults[3].status === 'fulfilled' ? petroleumResults[3].value : null),
      heatingOil: parsePriceSeries(petroleumResults[4].status === 'fulfilled' ? petroleumResults[4].value : null),
    };

    const naturalGas = {
      henryHub: parsePriceSeries(ngResults[0].status === 'fulfilled' ? ngResults[0].value : null),
    };

    const _sources = {};
    _sources.eia_elecResidential = electricity.residential != null;
    _sources.eia_elecCommercial = electricity.commercial != null;
    _sources.eia_elecIndustrial = electricity.industrial != null;
    _sources.eia_co2Total = co2Emissions.total != null;
    _sources.eia_co2BySector = co2Emissions.bySector != null;
    _sources.eia_petroleumWTI = petroleum.wti != null;
    _sources.eia_petroleumBrent = petroleum.brent != null;
    _sources.eia_petroleumGasoline = petroleum.gasoline != null;
    _sources.eia_petroleumDiesel = petroleum.diesel != null;
    _sources.eia_petroleumHeatingOil = petroleum.heatingOil != null;
    _sources.eia_naturalGasHenryHub = naturalGas.henryHub != null;

    const anySourceLive = Object.values(_sources).some(v => v === true);

    const result = {
      electricity,
      co2Emissions,
      petroleum,
      naturalGas,
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
