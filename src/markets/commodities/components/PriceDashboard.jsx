// src/markets/commodities/components/PriceDashboard.jsx
import React from 'react';
import './CommodComponents.css';
export default function PriceDashboard({ priceDashboardData }) {
  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Price Dashboard</span>
        <span className="com-panel-subtitle">Live commodity prices — Energy · Metals · Agriculture</span>
      </div>
      <div className="com-scroll"><div style={{ color: '#475569', fontSize: 12 }}>Stub — full implementation coming in Task 3</div></div>
    </div>
  );
}
