import React, { useMemo, useState } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './BisPropertyPricePanel.css';

const COUNTRY_META = {
  US: { name: 'United States', flag: '🇺🇸' },
  UK: { name: 'United Kingdom', flag: '🇬🇧' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  FR: { name: 'France', flag: '🇫🇷' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  IT: { name: 'Italy', flag: '🇮🇹' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  CH: { name: 'Switzerland', flag: '🇨🇭' },
  SE: { name: 'Sweden', flag: '🇸🇪' },
  NO: { name: 'Norway', flag: '🇳🇴' },
  DK: { name: 'Denmark', flag: '🇩🇰' },
  IE: { name: 'Ireland', flag: '🇮🇪' },
  PT: { name: 'Portugal', flag: '🇵🇹' },
  BE: { name: 'Belgium', flag: '🇧🇪' },
  AT: { name: 'Austria', flag: '🇦🇹' },
  FI: { name: 'Finland', flag: '🇫🇮' },
  PL: { name: 'Poland', flag: '🇵🇱' },
  CZ: { name: 'Czechia', flag: '🇨🇿' },
  HU: { name: 'Hungary', flag: '🇭🇺' },
  GR: { name: 'Greece', flag: '🇬🇷' },
  RO: { name: 'Romania', flag: '🇷🇴' },
  LU: { name: 'Luxembourg', flag: '🇱🇺' },
  IS: { name: 'Iceland', flag: '🇮🇸' },
  NZ: { name: 'New Zealand', flag: '🇳🇿' },
  CN: { name: 'China', flag: '🇨🇳' },
  IN: { name: 'India', flag: '🇮🇳' },
  SG: { name: 'Singapore', flag: '🇸🇬' },
  HK: { name: 'Hong Kong', flag: '🇭🇰' },
  TH: { name: 'Thailand', flag: '🇹🇭' },
  MY: { name: 'Malaysia', flag: '🇲🇾' },
  ID: { name: 'Indonesia', flag: '🇮🇩' },
  PH: { name: 'Philippines', flag: '🇵🇭' },
  BR: { name: 'Brazil', flag: '🇧🇷' },
  MX: { name: 'Mexico', flag: '🇲🇽' },
  CL: { name: 'Chile', flag: '🇨🇱' },
  CO: { name: 'Colombia', flag: '🇨🇴' },
  ZA: { name: 'South Africa', flag: '🇿🇦' },
  TR: { name: 'Türkiye', flag: '🇹🇷' },
  IL: { name: 'Israel', flag: '🇮🇱' },
  RU: { name: 'Russia', flag: '🇷🇺' },
};

const MAJORS = new Set(['US', 'UK', 'DE', 'FR', 'AU', 'CA', 'JP', 'CN', 'IN', 'BR']);

function fmtAcct(v, digits = 1) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function BisPropertyPricePanel() {
  const reCtx = useMarketData('realEstate');
  const data = reCtx?.data || {};
  const priceIndexData = data.priceIndexData;
  const [sort, setSort] = useState('yoy'); // yoy | name | index
  const [filter, setFilter] = useState('all'); // all | majors | em

  const countries = useMemo(() => {
    if (!priceIndexData || typeof priceIndexData !== 'object') return [];
    return Object.entries(priceIndexData)
      .map(([code, series]) => {
        if (!series?.values?.length) return null;
        const latest = series.values[series.values.length - 1];
        const prev12 =
          series.values.length > 4
            ? series.values[series.values.length - 5] // ~1y for quarterly
            : series.values[0];
        const yoy =
          prev12 != null && prev12 !== 0 && Number.isFinite(latest)
            ? ((latest - prev12) / prev12) * 100
            : null;
        const meta = COUNTRY_META[code] || { name: code, flag: '·' };
        return {
          code,
          name: meta.name,
          flag: meta.flag,
          latest,
          yoy,
          seriesKey: `bisProperty${code}`,
          seriesId: series.seriesId || null,
          isMajor: MAJORS.has(code),
        };
      })
      .filter(Boolean);
  }, [priceIndexData]);

  const rows = useMemo(() => {
    let list = [...countries];
    if (filter === 'majors') list = list.filter((c) => c.isMajor);
    if (filter === 'em') list = list.filter((c) => !c.isMajor);
    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'index') return (b.latest ?? 0) - (a.latest ?? 0);
      // yoy default — nulls last
      const ay = a.yoy;
      const by = b.yoy;
      if (ay == null && by == null) return a.name.localeCompare(b.name);
      if (ay == null) return 1;
      if (by == null) return -1;
      return by - ay;
    });
    return list;
  }, [countries, sort, filter]);

  if (!countries.length) {
    return (
      <div className="bis-pp-empty">
        BIS property price data unavailable.
      </div>
    );
  }

  const medianYoy = (() => {
    const ys = rows.map((r) => r.yoy).filter((v) => v != null && Number.isFinite(v)).sort((a, b) => a - b);
    if (!ys.length) return null;
    return ys[Math.floor(ys.length / 2)];
  })();

  return (
    <div className="bis-pp-panel">
      <div className="bis-pp-toolbar">
        <div className="bis-pp-summary">
          <span>{countries.length} economies</span>
          {medianYoy != null && (
            <span>
              median YoY{' '}
              <strong style={{ color: medianYoy >= 0 ? '#4ade80' : '#f87171' }}>
                {medianYoy >= 0 ? '+' : ''}
                {fmtAcct(medianYoy, 1)}%
              </strong>
            </span>
          )}
        </div>
        <div className="bis-pp-controls">
          <select
            className="bis-pp-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter countries"
          >
            <option value="all">All</option>
            <option value="majors">Majors</option>
            <option value="em">Other</option>
          </select>
          <select
            className="bis-pp-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort countries"
          >
            <option value="yoy">Sort: YoY</option>
            <option value="index">Sort: Index</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      <div className="bis-pp-thead">
        <span>Country</span>
        <span className="num">Index</span>
        <span className="num">YoY</span>
      </div>
      <div className="bis-pp-tbody">
        {rows.map((c) => (
          <div key={c.code} className="bis-pp-row">
            <span className="bis-pp-country">
              <span className="bis-pp-flag">{c.flag}</span>
              <span className="bis-pp-name">
                <strong>{c.code}</strong>
                <span className="bis-pp-sub">{c.name}</span>
              </span>
            </span>
            <span className="bis-pp-idx">
              <MetricValue
                value={c.latest}
                seriesKey={c.seriesKey}
                timestamp={data.lastUpdated}
                format={(v) => fmtAcct(v, 1)}
              />
            </span>
            <span className={`bis-pp-yoy ${(c.yoy ?? 0) >= 0 ? 'pos' : 'neg'}`}>
              {c.yoy != null
                ? `${c.yoy >= 0 ? '+' : ''}${fmtAcct(c.yoy, 1)}%`
                : '—'}
            </span>
          </div>
        ))}
      </div>
      <div className="bis-pp-footer">
        BIS residential PPI · rebased 2015=100 · FRED Q*R628BIS · live only
      </div>
    </div>
  );
}
