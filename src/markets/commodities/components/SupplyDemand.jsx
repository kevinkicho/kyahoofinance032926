// src/markets/commodities/components/SupplyDemand.jsx
import React from 'react';
import './CommodComponents.css';
export default function SupplyDemand({ supplyDemandData }) {
  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Supply &amp; Demand Monitor</span>
      </div>
      <div className="com-sd-grid">
        <div className="com-sd-panel"><div className="com-sd-title">US Crude Oil Stocks</div></div>
        <div className="com-sd-panel"><div className="com-sd-title">Natural Gas Storage</div></div>
        <div className="com-sd-panel"><div className="com-sd-title">US Crude Production</div></div>
      </div>
    </div>
  );
}
