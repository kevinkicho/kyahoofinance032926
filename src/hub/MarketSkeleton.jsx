import React from 'react';
import './Skeleton.css';

/**
 * Reusable skeleton loading screen for any market tab.
 * Drop-in replacement for the "Loading..." spinner in each market component.
 */
export default function MarketSkeleton({ tabs = 4, kpis = 4, charts = 2 }) {
  return (
    <div className="skeleton-market">
      <div className="skeleton-header">
        {Array.from({ length: tabs }, (_, i) => <div key={i} className="skeleton skeleton-tab" />)}
      </div>
      <div className="skeleton skeleton-status" />
      <div className="skeleton-kpi-strip">
        {Array.from({ length: kpis }, (_, i) => <div key={i} className="skeleton skeleton-kpi" />)}
      </div>
      <div className="skeleton-row">
        {Array.from({ length: charts }, (_, i) => <div key={i} className="skeleton skeleton-chart" />)}
      </div>
      <div className="skeleton skeleton-table" />
      <div className="skeleton skeleton-footer" />
    </div>
  );
}
