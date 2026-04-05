// src/markets/commodities/components/FuturesCurve.jsx
import React from 'react';
import './CommodComponents.css';
export default function FuturesCurve({ futuresCurveData }) {
  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">WTI Crude Oil Futures Curve</span>
      </div>
      <div className="com-chart-wrap" />
    </div>
  );
}
