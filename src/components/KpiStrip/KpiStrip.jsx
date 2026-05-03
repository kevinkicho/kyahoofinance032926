import React from 'react';

const KpiStrip = ({ metrics, accentColor }) => {
  if (!metrics || metrics.length === 0) return null;
  return (
    <div className="kpi-strip" style={{ 
      borderTop: `4px solid ${accentColor}`, 
      background: 'var(--bg-card)', 
      borderRadius: '8px', 
      padding: '12px 16px', 
      marginBottom: '20px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      {metrics.map((m, i) => (
        <div key={i} className="kpi-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="kpi-label" style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</span>
          <span className="kpi-value" style={{ fontSize: '20px', fontWeight: '700', color: accentColor }}>
            {m.prefix}{typeof m.value === 'number' ? m.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}{m.unit}
          </span>
        </div>
      ))}
    </div>
  );
};

export default KpiStrip;
