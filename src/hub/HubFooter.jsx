import React, { useState, useEffect } from 'react';
import './HubFooter.css';

const MARKET_LABELS = {
  bonds:          'Bonds',
  derivatives:    'Derivatives',
  realEstate:     'Real Estate',
  insurance:      'Insurance',
  commodities:    'Commodities',
  globalMacro:    'Global Macro',
  equityDeepDive: 'Equity+',
};

export default function HubFooter() {
  const [now, setNow] = useState(new Date());
  const [cacheStatus, setCacheStatus] = useState(null);

  // Clock ticks every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fetch cache status once on mount
  useEffect(() => {
    fetch('/api/cache/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCacheStatus(data); })
      .catch(() => {});
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <footer className="hub-footer">
      <span className="hub-footer-time">{dateStr} · {timeStr}</span>
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
            return <span key={id} className={cls}>{text}</span>;
          })}
        </div>
      )}
    </footer>
  );
}
