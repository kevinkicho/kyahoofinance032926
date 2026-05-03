import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';

const CurrencyCorrelationMatrix = ({ history = {}, lastUpdated }) => {
  const { colors } = useTheme();
  
  const correlationData = useMemo(() => {
    const currencies = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK', 'NZD'];
    const matrix = [];
    
    // Filter currencies that actually have history data
    const availableCcy = currencies.filter(ccy => history[ccy]?.length > 0);
    
    if (availableCcy.length === 0) return null;

    const calculateCorrelation = (arr1, arr2) => {
      const n = Math.min(arr1.length, arr2.length);
      if (n < 2) return 0;
      
      const slice1 = arr1.slice(-n);
      const slice2 = arr2.slice(-n);
      
      const mean1 = slice1.reduce((a, b) => a + b, 0) / n;
      const mean2 = slice2.reduce((a, b) => a + b, 0) / n;
      
      let num = 0, den1 = 0, den2 = 0;
      for (let i = 0; i < n; i++) {
        const d1 = slice1[i] - mean1;
        const d2 = slice2[i] - mean2;
        num += d1 * d2;
        den1 += d1 * d1;
        den2 += d2 * d2;
      }
      
      const den = Math.sqrt(den1 * den2);
      return den === 0 ? 0 : num / den;
    };

    availableCcy.forEach(ccy1 => {
      const row = [];
      availableCcy.forEach(ccy2 => {
        row.push({
          ccy2,
          value: calculateCorrelation(history[ccy1] || [], history[ccy2] || [])
        });
      });
      matrix.push({ ccy1, row });
    });

    return { labels: availableCcy, matrix };
  }, [history]);

  if (!correlationData) return <div className="fx-empty">No history available for correlation</div>;

  const getColor = (val) => {
    if (val > 0.7) return '#22c55e'; // Strong positive
    if (val > 0.3) return '#86efac';
    if (val < -0.7) return '#ef4444'; // Strong negative
    if (val < -0.3) return '#fca5a5';
    return colors.cardBg; 
  };

  return (
    <div className="fx-correlation-matrix">
      <div className="fx-matrix-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${correlationData.labels.length}, 1fr)`, gap: '2px' }}>
        {correlationData.matrix.map((row, i) => (
          <React.Fragment key={row.ccy1}>
            {row.row.map((cell, j) => (
              <div 
                key={`${i}-${j}`} 
                className="fx-matrix-cell" 
                style={{ 
                  backgroundColor: getColor(cell.value), 
                  color: Math.abs(cell.value) > 0.5 ? colors.text : colors.textMuted,
                  fontSize: '10px',
                  textAlign: 'center',
                  padding: '4px 0',
                  borderRadius: '2px'
                }}
              >
                {cell.value.toFixed(2)}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="fx-matrix-labels" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: colors.textMuted }}>
        {correlationData.labels.map(l => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
};

export default React.memo(CurrencyCorrelationMatrix);
