// src/markets/commodities/components/SectorHeatmap.jsx
import React from 'react';
import './CommodComponents.css';
export default function SectorHeatmap({ sectorHeatmapData }) {
  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Sector Performance Heatmap</span>
      </div>
      <div className="com-scroll" />
    </div>
  );
}
