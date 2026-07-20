import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import EquitiesDeepDiveDashboard from './components/EquitiesDeepDiveDashboard';
import EquitiesDeepDiveKpiStrip from './components/EquitiesDeepDiveKpiStrip';
import EquitiesDeepDiveSidebar from './components/EquitiesDeepDiveSidebar';
import { normalizeEquityDeepDiveData } from '../../data/marketNormalizers';
import MetricValue from '../../components/MetricValue/MetricValue';
import SafeECharts from '../../components/SafeECharts/SafeECharts';
import './EquitiesDeepDiveMarket.css';

function getEquityDeepDiveProps(centralData, institutionalCtx) {
  const d = centralData.data || {};
  const normalized = normalizeEquityDeepDiveData(d);
  const values = normalized.values;
  const i = institutionalCtx?.data || {
    lastUpdated: null,
    institutions: [],
    aggregateTopHoldings: [],
    recentChanges: { lastQuarter: null, bigBuys: [], bigSells: [], newPositions: [] },
  };
  return {
    sectorData: values.sectorData,
    factorData: values.factorData,
    earningsData: values.earningsData,
    shortData: values.shortData,
    insiderData: values.insiderData,
    equityRiskPremium: values.equityRiskPremium,
    spPE: values.spPE,
    breadthDivergence: values.breadthDivergence,
    buffettIndicator: values.buffettIndicator,
    institutionalData: { ...i, isLive: institutionalCtx?.isLive, lastUpdated: institutionalCtx?.lastUpdated, isLoading: institutionalCtx?.isLoading, error: institutionalCtx?.error, fetchedOn: institutionalCtx?.fetchedOn, isCurrent: institutionalCtx?.isCurrent, fetchLog: institutionalCtx?.fetchLog || [], refetch: institutionalCtx?.refetch },
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function EquitiesDeepDiveMarket({ centralData, institutionalData: institutionalCtx } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getEquityDeepDiveProps(centralData, institutionalCtx);

  if (props.isLoading) return <MarketSkeleton />;

    // KPI strip + sidebar are passed into the Dashboard so they live as
    // real bento grid children alongside every other panel.
    const kpiPanel = (
      <EquitiesDeepDiveKpiStrip
        sectorData={props.sectorData}
        factorData={props.factorData}
      />
    );

    const sidebarPanel = (
      <EquitiesDeepDiveSidebar
        sectorData={props.sectorData?.sectors || []}
        factorData={props.factorData?.factorReturns || []}
        earningsData={props.earningsData}
        shortData={props.shortData}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
        fetchLog={props.fetchLog}
        error={props.error}
        fetchedOn={props.fetchedOn}
        isCurrent={props.isCurrent}
      />
    );

    return (
      <div className="eqd-market">
        <div className="eqd-market-provenance" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px', fontSize: 11, color: 'var(--text-secondary)' }}>
          <MetricValue value={props.lastUpdated} seriesKey="eqdLastUpdated" timestamp={props.lastUpdated} format={v => v ? new Date(v).toLocaleString() : '—'} />
          <SafeECharts option={{}} style={{ width: 0, height: 0 }} sourceInfo={{ title: 'Equities Deep Dive', source: 'Yahoo Finance / FRED / SEC EDGAR', endpoint: '/api/equityDeepDive', series: [], updatedAt: props.lastUpdated }} />
        </div>
        <EquitiesDeepDiveDashboard
          kpiPanel={kpiPanel}
          sidebarPanel={sidebarPanel}
          sectorData={props.sectorData}
          factorData={props.factorData}
          earningsData={props.earningsData}
          shortData={props.shortData}
          insiderData={props.insiderData}
          institutionalData={props.institutionalData}
          equityRiskPremium={props.equityRiskPremium}
          spPE={props.spPE}
          buffettIndicator={props.buffettIndicator}
          breadthDivergence={props.breadthDivergence}
          error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
          isHistorical={props.isHistorical} asOfDate={props.asOfDate}
          fetchLog={props.fetchLog}
          isLive={props.isLive}
          lastUpdated={props.lastUpdated}
        />
      </div>
    );
}

export default React.memo(EquitiesDeepDiveMarket);
