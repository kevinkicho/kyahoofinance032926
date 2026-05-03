import React, { useMemo } from 'react';
import MarketKpiStrip from '../../../components/MarketKpiStrip';

const InsuranceKpiStrip = ({
  combinedRatio,
  prices = {},
  hyOas,
  sectorETF
}) => {
  const kpis = useMemo(() => {
    const items = [];

    if (combinedRatio != null) {
      items.push({
        label: 'Combined Ratio',
        value: `${combinedRatio}%`,
        color: combinedRatio > 100 ? '#f87171' : combinedRatio > 95 ? '#fbbf24' : '#4ade80',
        sublabel: combinedRatio > 100 ? 'Underwriting loss' : combinedRatio > 95 ? 'Marginal' : 'Profitable',
      });
    }

    for (const [ticker, label] of [['PGR', 'PGR'], ['ALL', 'ALL'], ['TRV', 'TRV'], ['HIG', 'HIG']]) {
      const data = prices[ticker];
      if (data?.price != null) {
        const change = data.change;
        items.push({
          label,
          value: `$${Number(data.price).toFixed(2)}`,
          color: change >= 0 ? '#4ade80' : '#f87171',
          trend: change != null ? `${change >= 0 ? '+' : ''}${Number(change).toFixed(2)}%` : null,
          sublabel: change >= 0 ? '▲' : '▼',
        });
      }
    }

    if (hyOas != null) {
      items.push({
        label: 'HY OAS',
        value: `${Math.round(hyOas)} bps`,
        color: hyOas > 400 ? '#f87171' : hyOas > 300 ? '#fbbf24' : '#22c55e',
        sublabel: 'High Yield Spread',
      });
    }

    if (sectorETF?.price != null) {
      const etfChange = sectorETF.change;
      items.push({
        label: 'KIE ETF',
        value: `$${Number(sectorETF.price).toFixed(2)}`,
        color: etfChange >= 0 ? '#4ade80' : '#f87171',
        trend: etfChange != null ? `${etfChange >= 0 ? '+' : ''}${Number(etfChange).toFixed(2)}%` : null,
        sublabel: 'Insurance Sector',
      });
    }

    return items;
  }, [combinedRatio, prices, hyOas, sectorETF]);

  return <MarketKpiStrip kpis={kpis} />;
};

export default React.memo(InsuranceKpiStrip);