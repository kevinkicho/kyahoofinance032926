import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SentimentMarket from '../../markets/sentiment/SentimentMarket';
import DataContext from '../../hub/DataContext';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: () => <div data-testid="echarts-mock" /> }));

function renderWithContext(ui, { getMarketExtra = {} } = {}) {
  const ctxValue = {
    getMarket: (id) => getMarketExtra[id] || { isLoading: false, isLive: false, data: {} },
    refetchSingle: vi.fn(),
  };
  return render(<DataContext.Provider value={ctxValue}>{ui}</DataContext.Provider>);
}

const baseData = {
  fearGreedData: { value: 50, label: 'Neutral', history: { dates: [], values: [] } },
  cftcData: null,
  riskData: null,
  marginDebt: null,
  consumerCredit: null,
  vvixHistory: null,
  fsiHistory: null,
};

describe('SentimentMarket cross-asset panel', () => {
  it('renders Cross-Asset Returns rows when returnsData.assets is present', () => {
    const centralData = {
      isLoading: false,
      isLive: true,
      isCurrent: true,
      lastUpdated: '2026-08-04',
      fetchedOn: '2026-08-04',
      error: null,
      fetchLog: [],
      refetch: () => {},
      data: {
        ...baseData,
        returnsData: {
          assets: [
            { ticker: 'SPY', label: 'S&P 500', ret1d: 1.42 },
            { ticker: 'QQQ', label: 'Nasdaq', ret1d: -0.5 },
          ],
        },
      },
    };
    renderWithContext(<SentimentMarket centralData={centralData} />);
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('Nasdaq')).toBeInTheDocument();
    expect(screen.getByText('+1.42%')).toBeInTheDocument();
    expect(screen.getByText('-0.50%')).toBeInTheDocument();
  });

  it('shows empty state when returnsData is absent', () => {
    const centralData = {
      isLoading: false,
      isLive: true,
      isCurrent: true,
      lastUpdated: '2026-08-04',
      fetchedOn: '2026-08-04',
      error: null,
      fetchLog: [],
      refetch: () => {},
      data: { ...baseData, returnsData: null },
    };
    renderWithContext(<SentimentMarket centralData={centralData} />);
    expect(screen.getByText(/No cross-asset returns/i)).toBeInTheDocument();
  });

  it('does not remount-crash when leftover riskData.signals bag is isLive-only', () => {
    const centralData = {
      isLoading: false,
      isLive: true,
      isCurrent: true,
      lastUpdated: '2026-08-16',
      fetchedOn: '2026-08-16',
      error: null,
      fetchLog: [],
      refetch: () => {},
      data: {
        ...baseData,
        fearGreedData: { value: 50, label: 'Neutral', history: { dates: [], values: [] } },
        riskData: { signals: { isLive: true } },
        returnsData: { assets: [{ ticker: 'SPY', label: 'S&P 500', ret1d: 1.42 }] },
        cftcData: { currencies: [] },
      },
    };
    expect(() => renderWithContext(<SentimentMarket centralData={centralData} />)).not.toThrow();
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
  });
});
