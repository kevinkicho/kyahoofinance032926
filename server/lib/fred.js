import { fetchJSON } from './fetch.js';

export async function fetchFredSeries(seriesId, apiKey) {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'desc',
  });
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  const data = await fetchJSON(url);
  return (data?.observations || []).filter(o => o.value !== '.').map(o => ({
    date: o.date,
    value: parseFloat(o.value),
  }));
}

export async function fetchFredHistory(seriesId, apiKey, limit = 13) {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'desc',
    limit: String(limit),
  });
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}

export async function fetchFredLatest(seriesId, apiKey) {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'desc',
    limit: '5',
  });
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  const data = await fetchJSON(url);
  const valid = (data?.observations || []).filter(o => o.value !== '.');
  return valid.length ? parseFloat(valid[0].value) : null;
}
