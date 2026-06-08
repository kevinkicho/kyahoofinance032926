// Minimal SDMX-JSON parser for ECB SDW, Eurostat, and OECD APIs.
//
// Background: SDMX-JSON is the standard format these agencies use. Each
// response carries a multi-dimensional series cube — the consumer has to
// walk dimension indices to recover (key → values) pairs. The format is
// powerful but verbose; this helper flattens it into a friendly shape:
//
//   parseSdmx(json) → [
//     { key: ['DE', 'M'], dims: { GEO: 'DE', FREQ: 'M' }, observations: [
//       { period: '2024-01', value: 2.3 },
//       { period: '2024-02', value: 2.5 },
//       ...
//     ] },
//     ...
//   ]
//
// Both legacy SDMX-JSON (`dataSets[].series`) and newer SDMX-JSON 2.0
// (`data.dataSets`) shapes are accepted.

function buildDimIndex(structure) {
  // Older shape: structure.dimensions.{series, observation}
  // Newer shape: data.structures[0].dimensions.{series, observation}
  const dims = structure?.dimensions || {};
  const seriesDims = dims.series || [];
  const obsDims = dims.observation || [];
  return { seriesDims, obsDims };
}

function decodeKey(keyStr, seriesDims) {
  // Key is like "0:5:2" — colon-separated indices into each series dimension.
  const parts = keyStr.split(':').map(Number);
  return parts.map((idx, i) => {
    const dim = seriesDims[i];
    if (!dim) return String(idx);
    const vals = dim.values || [];
    return vals[idx]?.id ?? vals[idx]?.name ?? String(idx);
  });
}

function decodeKeyDict(keyStr, seriesDims) {
  const parts = keyStr.split(':').map(Number);
  const out = {};
  parts.forEach((idx, i) => {
    const dim = seriesDims[i];
    if (!dim) return;
    const vals = dim.values || [];
    out[dim.id] = vals[idx]?.id ?? vals[idx]?.name ?? String(idx);
  });
  return out;
}

function decodeObservation(obsKeyStr, observationsBucket, obsDims) {
  // obsKeyStr is the index into obsDims[0] (TIME_PERIOD usually).
  const idx = Number(obsKeyStr);
  const period = obsDims[0]?.values?.[idx]?.id ?? obsDims[0]?.values?.[idx]?.name ?? String(idx);
  const value = observationsBucket?.[0];
  return { period, value: value == null ? null : Number(value) };
}

export function parseSdmx(json) {
  if (!json || typeof json !== 'object') return [];

  // Locate the structure block + first dataset.
  // Eurostat (legacy):  json.structure + json.dataSets[0]
  // ECB SDW:            json.structure + json.dataSets[0]  (similar)
  // OECD (newer):       json.data.structures[0] + json.data.dataSets[0]
  let structure, dataSet;
  if (json.structure && Array.isArray(json.dataSets)) {
    structure = json.structure;
    dataSet = json.dataSets[0];
  } else if (json.data?.structures?.[0] && Array.isArray(json.data?.dataSets)) {
    structure = json.data.structures[0];
    dataSet = json.data.dataSets[0];
  } else {
    return [];
  }

  const { seriesDims, obsDims } = buildDimIndex(structure);
  const series = dataSet?.series || {};
  const out = [];
  for (const [keyStr, body] of Object.entries(series)) {
    const dimsArr = decodeKey(keyStr, seriesDims);
    const dimsObj = decodeKeyDict(keyStr, seriesDims);
    const observations = [];
    for (const [obsKey, bucket] of Object.entries(body.observations || {})) {
      observations.push(decodeObservation(obsKey, bucket, obsDims));
    }
    observations.sort((a, b) => (a.period < b.period ? -1 : 1));
    out.push({ key: dimsArr, dims: dimsObj, observations });
  }
  return out;
}

// Convenience: pick the latest observation per series, return [{ ...dims, period, value }]
export function latestPerSeries(parsed) {
  return parsed.map(s => {
    const last = s.observations[s.observations.length - 1];
    return { ...s.dims, period: last?.period, value: last?.value };
  });
}

// JSON-stat 2.0 parser — Eurostat's default format.
// Shape:
//   { value: {idx: number}, dimension: {dimId: {category: {index: {key:i}, label:{key:str}}}}, id: [dimIds], size: [Nperdim] }
//
// Returns the same {key, dims, observations} array shape as parseSdmx().
// `valueDimId` defaults to the LAST dimension ID (typically "time").
export function parseJsonStat(json, valueDimId = null) {
  if (!json || typeof json !== 'object' || !json.dimension || !json.id || !json.size) return [];
  const dimIds = json.id;
  const sizes = json.size;
  const valDimIdx = valueDimId ? dimIds.indexOf(valueDimId) : (dimIds.length - 1);
  if (valDimIdx < 0) return [];

  // For each dimension, build [position → key] and [position → label] lookups.
  const dims = dimIds.map(id => {
    const cat = json.dimension[id]?.category || {};
    const indexMap = cat.index || {};
    // index can be either {key: pos} (object) or [keys...] (array).
    const posToKey = [];
    if (Array.isArray(indexMap)) {
      for (let i = 0; i < indexMap.length; i++) posToKey[i] = indexMap[i];
    } else {
      for (const [key, pos] of Object.entries(indexMap)) posToKey[pos] = key;
    }
    return { id, posToKey };
  });

  // Decode flat index → list of dim positions, given the size array (row-major).
  function decodeIndex(flat) {
    const positions = new Array(sizes.length);
    let rem = flat;
    for (let i = sizes.length - 1; i >= 0; i--) {
      positions[i] = rem % sizes[i];
      rem = Math.floor(rem / sizes[i]);
    }
    return positions;
  }

  // Walk every populated value in the cube. Group by series-key (everything
  // except the value-dimension), with observations indexed by valueDim position.
  const seriesMap = new Map();
  const values = json.value;
  const entries = Array.isArray(values)
    ? values.map((v, i) => v == null ? null : [String(i), v]).filter(Boolean)
    : Object.entries(values);

  for (const [idxStr, value] of entries) {
    const positions = decodeIndex(Number(idxStr));
    const seriesKey = positions.map((p, i) => i === valDimIdx ? '' : `${dims[i].id}=${dims[i].posToKey[p]}`).filter(Boolean).join('|');
    const period = dims[valDimIdx].posToKey[positions[valDimIdx]];
    if (!seriesMap.has(seriesKey)) {
      const dimsObj = {};
      positions.forEach((p, i) => {
        if (i !== valDimIdx) dimsObj[dims[i].id] = dims[i].posToKey[p];
      });
      seriesMap.set(seriesKey, { dims: dimsObj, observations: [] });
    }
    seriesMap.get(seriesKey).observations.push({ period, value: value == null ? null : Number(value) });
  }

  // Sort each series' observations chronologically.
  const out = [];
  for (const s of seriesMap.values()) {
    s.observations.sort((a, b) => (a.period < b.period ? -1 : 1));
    s.key = Object.values(s.dims);
    out.push(s);
  }
  return out;
}
