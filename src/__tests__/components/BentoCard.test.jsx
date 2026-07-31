import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BentoCard from '../../components/BentoCard/BentoCard';

// DataFooter pulls in MetricValue, charts, etc. — stub it for these unit
// tests so we're only asserting BentoCard's contract, not the footer's.
vi.mock('../../components/DataFooter/DataFooter', () => ({
  default: (props) => (
    <div
      data-testid="data-footer"
      data-source={props.source}
      data-islive={String(props.isLive)}
      data-has-refresh={typeof props.onRefresh === 'function' ? '1' : '0'}
    />
  ),
}));

vi.mock('../../hub/DataContext', () => ({
  useMarketData: () => ({ isLoading: false, isRefreshing: false }),
  useRefetchSingle: () => () => {},
  useDataContext: () => null,
}));

describe('BentoCard', () => {
  it('renders the title', () => {
    render(<BentoCard title="Yield Curve">body with 12.3 value</BentoCard>);
    expect(screen.getByText('Yield Curve')).toBeInTheDocument();
  });

  it('disables empty panels instead of unmounting', () => {
    const { container } = render(<BentoCard title="Empty panel" disabled emptyMessage="No data available" />);
    const root = container.querySelector('.bento-card');
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-panel-disabled')).toBe('1');
    expect(root.classList.contains('bento-card--disabled')).toBe(true);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  // Content with digits so auto-disable does not treat the card as empty.
  const liveBody = 'series 4.25%';

  it('renders subtitle when provided', () => {
    render(<BentoCard title="X" subtitle="some context">{liveBody}</BentoCard>);
    expect(screen.getByText('some context')).toBeInTheDocument();
  });

  it('omits subtitle node entirely when not provided', () => {
    const { container } = render(<BentoCard title="X">{liveBody}</BentoCard>);
    expect(container.querySelector('.bento-panel-subtitle')).toBeNull();
  });

  it('renders titleActions slot when provided', () => {
    render(
      <BentoCard title="X" titleActions={<button>refresh</button>}>{liveBody}</BentoCard>
    );
    expect(screen.getByRole('button', { name: 'refresh' })).toBeInTheDocument();
  });

  it('applies the accent class when given a known accent', () => {
    const { container } = render(<BentoCard title="X" accent="bonds">{liveBody}</BentoCard>);
    expect(container.querySelector('.bento-card--bonds')).toBeTruthy();
  });

  it('does NOT apply an unknown accent class', () => {
    const { container } = render(<BentoCard title="X" accent="not-a-real-tab">{liveBody}</BentoCard>);
    expect(container.querySelector('.bento-card--not-a-real-tab')).toBeNull();
  });

  it('honors accentColor as inline style override', () => {
    const { container } = render(<BentoCard title="X" accentColor="#ff0000">{liveBody}</BentoCard>);
    const root = container.querySelector('.bento-card');
    expect(root.style.getPropertyValue('--bento-accent-color')).toBe('#ff0000');
  });

  it('applies extra className alongside the base', () => {
    const { container } = render(<BentoCard title="X" className="custom-mod">{liveBody}</BentoCard>);
    const root = container.querySelector('.bento-card');
    expect(root.className).toContain('bento-card');
    expect(root.className).toContain('custom-mod');
  });

  it('applies contentClassName to the content wrapper', () => {
    const { container } = render(
      <BentoCard title="X" contentClassName="extra-pad scroll">{liveBody}</BentoCard>
    );
    const content = container.querySelector('.bento-panel-content');
    expect(content.className).toContain('bento-panel-content');
    expect(content.className).toContain('extra-pad');
    expect(content.className).toContain('scroll');
  });

  it('renders DataFooter by default and passes provenance props through', () => {
    render(<BentoCard title="X" source="FRED" isLive>{liveBody}</BentoCard>);
    const footer = screen.getByTestId('data-footer');
    expect(footer).toBeInTheDocument();
    expect(footer.getAttribute('data-source')).toBe('FRED');
    expect(footer.getAttribute('data-islive')).toBe('true');
  });

  it('wires panel refresh when market or accent is set', () => {
    render(<BentoCard title="X" accent="bonds" source="FRED">{liveBody}</BentoCard>);
    expect(screen.getByTestId('data-footer').getAttribute('data-has-refresh')).toBe('1');
  });

  it('suppresses DataFooter when noFooter is true', () => {
    render(<BentoCard title="X" source="FRED" noFooter>{liveBody}</BentoCard>);
    expect(screen.queryByTestId('data-footer')).toBeNull();
  });

  it('renders custom footer JSX when footer prop is provided', () => {
    render(
      <BentoCard title="X" footer={<div data-testid="custom-foot">custom</div>}>{liveBody}</BentoCard>
    );
    expect(screen.getByTestId('custom-foot')).toBeInTheDocument();
    // DataFooter should NOT render when footer prop is provided
    expect(screen.queryByTestId('data-footer')).toBeNull();
  });

  it('bare mode skips outer chrome and renders children only', () => {
    const { container } = render(<BentoCard title="X" bare>only the body</BentoCard>);
    expect(container.querySelector('.bento-card')).toBeNull();
    expect(container.querySelector('.bento-panel-title-row')).toBeNull();
    expect(container.querySelector('[data-testid="data-footer"]')).toBeNull();
    expect(container.textContent).toBe('only the body');
  });

  it('content wrapper stops mouseDown propagation (drag-cancel contract)', () => {
    const onMouseDownParent = vi.fn();
    const { container } = render(
      <div onMouseDown={onMouseDownParent}>
        <BentoCard title="X">{liveBody}</BentoCard>
      </div>
    );
    const content = container.querySelector('.bento-panel-content');
    // Simulate a real mousedown bubbling up.
    const ev = new MouseEvent('mousedown', { bubbles: true });
    content.dispatchEvent(ev);
    expect(onMouseDownParent).not.toHaveBeenCalled();
  });

  it('keeps the title row class so react-grid-layout can find drag handle', () => {
    const { container } = render(<BentoCard title="X">{liveBody}</BentoCard>);
    // BentoWrapper passes draggableHandle=".bento-panel-title-row" — this
    // selector MUST match on every card or drag breaks.
    expect(container.querySelector('.bento-panel-title-row')).toBeTruthy();
  });

  it('renders children inside the content wrapper', () => {
    render(<BentoCard title="X"><span data-testid="kid">payload 99</span></BentoCard>);
    expect(screen.getByTestId('kid')).toBeInTheDocument();
  });
});
