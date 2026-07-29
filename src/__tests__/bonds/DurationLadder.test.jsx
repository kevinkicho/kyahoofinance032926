import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DurationLadder from '../../markets/bonds/components/DurationLadder';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));
vi.mock('../../hub/ThemeContext', () => ({ useTheme: () => ({ colors: { textMuted: '#64748b', textSecondary: '#94a3b8', cardBg: '#1e293b' } }) }));

const MOCK_DATA = [
  { bucket: '0–2y',  amount: 8420, pct: 34.2 },
  { bucket: '2–5y',  amount: 5980, pct: 24.3 },
  { bucket: '5–10y', amount: 6250, pct: 25.4 },
  { bucket: '10y+',       amount: 3950, pct: 16.1 },
];

describe('DurationLadder', () => {
  it('renders panel title and chart without treasuryRates', () => {
    render(<DurationLadder durationLadderData={MOCK_DATA} />);
    expect(screen.getByText('Duration Ladder')).toBeInTheDocument();
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('shows the bucket detail table with one row per bucket', () => {
    render(<DurationLadder durationLadderData={MOCK_DATA} />);
    expect(document.querySelectorAll('.dl-table-row').length).toBe(4);
  });

  it('renders em-dash placeholders in the rate column when no rates are supplied', () => {
    render(<DurationLadder durationLadderData={MOCK_DATA} />);
    // Last column ("Avg rate") falls back to em-dash for every bucket.
    const rateCells = [...document.querySelectorAll('.dl-table-row .dl-td-num:last-child')];
    expect(rateCells.length).toBe(4);
    expect(rateCells.every((el) => el.textContent.includes('—') || el.textContent.includes('–'))).toBe(true);
  });

  it('shows formatted rate values in the table when treasuryRates provided', () => {
    const rates = { '0–2y': 4.82, '2–5y': 4.01, '5–10y': 4.01, '10y+': 4.55 };
    render(<DurationLadder durationLadderData={MOCK_DATA} treasuryRates={rates} />);
    expect(screen.getByText('4.82%')).toBeInTheDocument();
    expect(screen.getByText('4.55%')).toBeInTheDocument();
  });

  it('shows bucket label alongside each rate row', () => {
    const rates = { '0–2y': 4.82, '2–5y': 4.01, '5–10y': 4.01, '10y+': 4.55 };
    render(<DurationLadder durationLadderData={MOCK_DATA} treasuryRates={rates} />);
    expect(screen.getAllByText('0–2y').length).toBeGreaterThanOrEqual(1);
  });
});
