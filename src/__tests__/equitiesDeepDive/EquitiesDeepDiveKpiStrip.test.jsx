import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EquitiesDeepDiveKpiStrip from '../../markets/equitiesDeepDive/components/EquitiesDeepDiveKpiStrip';

vi.mock('../../components/SafeECharts', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('EquitiesDeepDiveKpiStrip', () => {
  it('renders waiting state when sector and factor bags are empty', () => {
    render(<EquitiesDeepDiveKpiStrip sectorData={null} factorData={null} />);
    expect(screen.getByText(/waiting for sector & factor data/i)).toBeInTheDocument();
  });

  it('handles leftover isLive stock bags without remount-crashing', () => {
    expect(() => render(<EquitiesDeepDiveKpiStrip factorData={{ isLive: true }} />)).not.toThrow();
    expect(() => render(<EquitiesDeepDiveKpiStrip factorData={{ stocks: { isLive: true } }} />)).not.toThrow();
    expect(() => render(<EquitiesDeepDiveKpiStrip factorData={{ inFavor: { isLive: true }, stocks: true }} />)).not.toThrow();
    expect(() => render(<EquitiesDeepDiveKpiStrip factorData={{ stocks: { isLive: true }, inFavor: { momentum: 3.5 } }} />)).not.toThrow();
  });
});
