import React, { useState, useEffect } from 'react';
import { api, getApiInfo } from '../lib/api';
import DATA_SOURCES from './dataSources';
import './HubFooter.css';

const apiInfo = getApiInfo();

const MARKET_LABELS = {
  bonds:          'Bonds',
  derivatives:    'Derivatives',
  realEstate:     'Real Estate',
  insurance:      'Insurance',
  commodities_enhanced: 'Commodities',
  globalMacro:    'Global Macro',
  equityDeepDive: 'Equity+',
};

export default function HubFooter({ activeMarket }) {
  const [now, setNow] = useState(new Date());
  const [cacheStatus, setCacheStatus] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.get('/api/cache/status')
      .then(data => { if (data) setCacheStatus(data); })
      .catch(() => {});
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const sources = DATA_SOURCES[activeMarket] || [];

  return (
    <footer className="hub-footer" title={apiInfo.isExternal ? `Backend: ${apiInfo.base}` : 'Local dev (Vite proxy)'}>
      <span className="hub-footer-time">{dateStr} · {timeStr}</span>
      {apiInfo.isExternal && (
        <span className="hub-footer-backend" title={apiInfo.base}>
          api
        </span>
      )}

      {/* Data source attribution for active market */}
      {sources.length > 0 && (
        <div className="hub-footer-sources">
          <span className="hub-footer-sources-label">Sources:</span>
          {sources.map((src, i) => (
            <span key={src.name + i} className="hub-footer-source">
              <a href={src.url} target="_blank" rel="noopener noreferrer" title={src.items}>
                {src.name}
              </a>
              {i < sources.length - 1 && <span className="hub-footer-dot"> · </span>}
            </span>
          ))}
        </div>
      )}

      {cacheStatus && (
        <div className="hub-footer-badges">
          {Object.entries(MARKET_LABELS).map(([id, label]) => {
            const info = cacheStatus.status?.[id];
            if (!info) return null;
            const cls = info.isCurrent
              ? 'hub-badge hub-badge-fresh'
              : info.fetchedOn
                ? 'hub-badge hub-badge-stale'
                : 'hub-badge hub-badge-none';
            const text = info.isCurrent
              ? `${label} ✓`
              : info.fetchedOn
                ? `${label} · stale`
                : `${label} · no cache`;
            const titleText = `Data Provenance\nStatus: ${info.isCurrent ? 'Current' : 'Stale / Missing'}\nFetched: ${info.fetchedOn || 'Never'}\nSource: /api/cache/status`;
            return <span key={id} className={cls} title={titleText}>{text}</span>;
          })}
        </div>
      )}
    </footer>
  );
}
