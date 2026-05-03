import React, { useMemo } from 'react';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
import { useMarketData } from '../../../hub/DataContext';

export default function GlobalMacroKpiStrip({ scorecardData, centralBankData, lastUpdated, isLive, fetchLog, error, fetchedOn, isCurrent }) {
  const fxData = useMarketData('fx');

  const kpis = useMemo(() => {
    const items = [];
    if (!scorecardData?.length) return items;

    const us = scorecardData.find(c => c.code === 'US');
    const eu = scorecardData.find(c => c.code === 'EA');
    const cn = scorecardData.find(c => c.code === 'CN');

    if (us?.gdp != null) {
      items.push({
        label: '🇺🇸 US GDP',
        value: `${us.gdp.toFixed(1)}%`,
        color: us.gdp > 2 ? '#4ade80' : us.gdp > 0 ? '#fbbf24' : '#f87171',
        trend: us.gdp > 2 ? '↑' : us.gdp < 0.5 ? '↓' : '→',
        sublabel: 'YoY',
      });
    }
    if (eu?.gdp != null) {
      items.push({
        label: '🇪🇺 EU GDP',
        value: `${eu.gdp.toFixed(1)}%`,
        color: eu.gdp > 2 ? '#4ade80' : eu.gdp > 0 ? '#fbbf24' : '#f87171',
        trend: eu.gdp > 1.5 ? '↑' : eu.gdp < 0.5 ? '↓' : '→',
        sublabel: 'YoY',
      });
    }
    if (cn?.gdp != null) {
      items.push({
        label: '🇨🇳 CN GDP',
        value: `${cn.gdp.toFixed(1)}%`,
        color: cn.gdp > 5 ? '#4ade80' : cn.gdp > 0 ? '#fbbf24' : '#f87171',
        trend: cn.gdp > 5 ? '↑' : cn.gdp < 3 ? '↓' : '→',
        sublabel: 'YoY',
      });
    }

    const fedRate = centralBankData?.current?.find(c => c.code === 'US')?.rate;
    if (fedRate != null) {
      items.push({
        label: 'Fed Rate',
        value: `${fedRate.toFixed(2)}%`,
        color: fedRate > 5 ? '#f87171' : fedRate > 3 ? '#fbbf24' : '#4ade80',
        sublabel: 'FOMC',
      });
    }

    const dxyLatest = fxData?.data?.dxyHistory?.values?.slice(-1)[0];
    if (dxyLatest != null) {
      const dxyPrev = fxData?.data?.dxyHistory?.values?.slice(-2, -1)[0];
      const dxyChange = dxyPrev != null ? ((dxyLatest - dxyPrev) / dxyPrev) * 100 : null;
      items.push({
        label: 'DXY',
        value: dxyLatest.toFixed(2),
        color: dxyLatest > 105 ? '#f87171' : dxyLatest > 100 ? '#fbbf24' : '#4ade80',
        trend: dxyChange != null ? `${dxyChange >= 0 ? '+' : ''}${dxyChange.toFixed(1)}%` : null,
        sublabel: 'Dollar Index',
      });
    }

    const validCpi = scorecardData.filter(c => c.cpi != null);
    if (validCpi.length) {
      const avgCpi = validCpi.reduce((s, c) => s + c.cpi, 0) / validCpi.length;
      items.push({
        label: 'Avg CPI',
        value: `${avgCpi.toFixed(1)}%`,
        color: avgCpi < 2 ? '#4ade80' : avgCpi < 4 ? '#fbbf24' : '#f87171',
        trend: avgCpi < 2 ? '↓' : avgCpi > 5 ? '↑' : '→',
        sublabel: `${validCpi.length} countries`,
      });
    }

    return items;
  }, [scorecardData, centralBankData, fxData]);

  // `bare` mode skips the standalone panel chrome since this strip is
  // rendered inside a bento card that already provides title-row + footer.
  return <MarketKpiStrip kpis={kpis} bare />;
}