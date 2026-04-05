import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DurationLadder from '../../markets/bonds/components/DurationLadder';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const MOCK_DATA = [
  { bucket: '0\u20132y',  amount: 8420, pct: 34.2 },
  { bucket: '2\u20135y',  amount: 5980, pct: 24.3 },
  { bucket: '5\u201310y', amount: 6250, pct: 25.4 },
  { bucket: '10y+',       amount: 3950, pct: 16.1 },
];

describe('DurationLadder', () => {
  it('renders panel title and chart without treasuryRates', () => {
    render(<DurationLadder durationLadderData={MOCK_DATA} />);
    expect(screen.getByText('Duration Ladder')).toBeInTheDocument();
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('does not show rate pills when treasuryRates is null', () => {
    render(<DurationLadder durationLadderData={MOCK_DATA} />);
    expect(document.querySelectorAll('.dur-rate-pill').length).toBe(0);
  });

  it('shows four rate pills when treasuryRates provided', () => {
    const rates = { '0\u20132y': 4.82, '2\u20135y': 4.01, '5\u201310y': 4.01, '10y+': 4.55 };
    render(<DurationLadder durationLadderData={MOCK_DATA} treasuryRates={rates} />);
    expect(document.querySelectorAll('.dur-rate-pill').length).toBe(4);
  });

  it('shows formatted rate values in pills', () => {
    const rates = { '0\u20132y': 4.82, '2\u20135y': 4.01, '5\u201310y': 4.01, '10y+': 4.55 };
    render(<DurationLadder durationLadderData={MOCK_DATA} treasuryRates={rates} />);
    expect(screen.getByText('4.82%')).toBeInTheDocument();
    expect(screen.getByText('4.55%')).toBeInTheDocument();
  });

  it('shows bucket label alongside each rate pill', () => {
    const rates = { '0\u20132y': 4.82, '2\u20135y': 4.01, '5\u201310y': 4.01, '10y+': 4.55 };
    render(<DurationLadder durationLadderData={MOCK_DATA} treasuryRates={rates} />);
    // At least one element with the bucket text
    expect(screen.getAllByText('0\u20132y').length).toBeGreaterThanOrEqual(1);
  });
});
