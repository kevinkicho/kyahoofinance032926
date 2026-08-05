import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import './FredBudgetBadge.css';

/**
 * Operator-mode FRED throttle readout from /api/fred-throttle.
 */
export default function FredBudgetBadge({ enabled = true }) {
  const [fred, setFred] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const load = () => {
      api.get('/api/fred-throttle')
        .then((body) => {
          if (!cancelled && body?.fred) setFred(body.fred);
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);

  if (!enabled || !fred) return null;

  const used = fred.used ?? 0;
  const limit = fred.limit || 120;
  const pct = limit ? Math.round((used / limit) * 100) : 0;
  const hot = !!fred.hot || !!fred.atLimit || pct >= 80;
  const title = [
    `FRED rolling window: ${used}/${limit} (${pct}%)`,
    fred.remaining != null ? `remaining ~${fred.remaining}` : '',
    hot ? 'HOT — force-live demoted when at limit' : 'ok',
  ].filter(Boolean).join('\n');

  return (
    <span
      className={`fred-budget-badge${hot ? ' is-hot' : ''}`}
      title={title}
      role="status"
    >
      FRED {used}/{limit}
    </span>
  );
}
