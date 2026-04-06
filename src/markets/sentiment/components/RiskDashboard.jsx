// src/markets/sentiment/components/RiskDashboard.jsx
import React from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import './SentimentComponents.css';

function badgeClass(signal) {
  if (signal === 'risk-on')  return 'sent-badge sent-badge-on';
  if (signal === 'risk-off') return 'sent-badge sent-badge-off';
  return 'sent-badge sent-badge-neu';
}

function badgeLabel(signal) {
  if (signal === 'risk-on')  return 'Risk-On';
  if (signal === 'risk-off') return 'Risk-Off';
  return 'Neutral';
}

function scoreColor(score, textSecondary = '#94a3b8') {
  if (score >= 65) return '#7c3aed';
  if (score >= 50) return '#a78bfa';
  if (score >= 35) return textSecondary;
  return '#f87171';
}

export default function RiskDashboard({ riskData }) {
  const { colors } = useTheme();
  if (!riskData) return null;
  const { signals = [], overallScore = 50, overallLabel = 'Neutral' } = riskData;
  const color = scoreColor(overallScore, colors.textSecondary);

  return (
    <div className="sent-panel">
      <div className="sent-panel-header">
        <span className="sent-panel-title">Risk Dashboard</span>
        <span className="sent-panel-subtitle">Cross-asset risk-on / risk-off signals · FRED + Yahoo Finance</span>
      </div>
      <div className="sent-risk-grid">
        {signals.map(sig => (
          <div key={sig.name} className="sent-risk-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="sent-risk-name">{sig.name}</span>
              <span className={badgeClass(sig.signal)}>{badgeLabel(sig.signal)}</span>
            </div>
            <div className="sent-risk-value">{sig.fmt}</div>
            <div className="sent-risk-desc">{sig.description}</div>
          </div>
        ))}
      </div>
      <div className="sent-score-display">
        <div className="sent-score-value" style={{ color }}>{overallScore}</div>
        <div className="sent-score-label">Overall Risk Appetite Score · {overallLabel}</div>
      </div>
    </div>
  );
}
