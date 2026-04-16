import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const FRED_BASE = 'https://fred.stlouisfed.org/series';

function fredApiUrl(seriesId) {
  return `/api/fred/observations?series_id=${seriesId}&file_type=json&sort_order=desc&limit=5`;
}

function isFRED(id) {
  return id && /^[A-Z0-9]{3,15}$/.test(id) && !id.startsWith('/') && !id.startsWith('HTTP');
}

export default function ChartSourcePopover({ sourceInfo, anchorPos, onClose }) {
  const popoverRef = useRef(null);
  const [measured, setMeasured] = useState(false);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!anchorPos || !popoverRef.current) return;
    const el = popoverRef.current;
    const pH = el.offsetHeight;
    const PW = el.offsetWidth;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = anchorPos;
    if (x + PW > vw - 8) x = vw - PW - 8;
    if (x < 8) x = 8;
    if (y + pH > vh - 8) y = vh - pH - 8;
    if (y < 8) y = 8;
    setPos({ left: x, top: y });
    setMeasured(true);
  }, [anchorPos]);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => document.addEventListener('click', onClick, true), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick, true);
    };
  }, [onClose]);

  if (!sourceInfo) return null;

  const series = sourceInfo.series || [];

  return createPortal(
    <div
      ref={popoverRef}
      className="mv-popover chart-source-popover"
      style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="mv-popover-header">
        <div className="mv-name">{sourceInfo.title || 'Chart Data Source'}</div>
        <button className="mv-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <table className="mv-table">
        <tbody>
          {sourceInfo.source && (
            <tr><td className="mv-label">Source</td><td>{sourceInfo.source}</td></tr>
          )}
          {sourceInfo.endpoint && (
            <tr>
              <td className="mv-label">Endpoint</td>
              <td className="mv-mono">
                <a
                  href={sourceInfo.endpoint.startsWith('/') ? `${window.location.origin}${sourceInfo.endpoint}` : sourceInfo.endpoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'none', fontSize: 9 }}
                >{sourceInfo.endpoint}</a>
              </td>
            </tr>
          )}
          {sourceInfo.updatedAt && (
            <tr><td className="mv-label">Updated</td><td>{sourceInfo.updatedAt}</td></tr>
          )}
        </tbody>
      </table>
      {series.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 9, marginBottom: 4, color: 'var(--text-primary)' }}>Series</div>
          {series.map(s => (
            <div key={s.id || s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{s.id}</span>
              <span style={{ display: 'flex', gap: 4 }}>
                {isFRED(s.id) && (
                  <>
                    <a href={`${FRED_BASE}/${s.id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: 9 }}>Series Page</a>
                    <a href={fredApiUrl(s.id)} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: 9 }}>Fetch JSON</a>
                  </>
                )}
                {!isFRED(s.id) && s.url && (
                  <a href={s.url.startsWith('/') ? `${window.location.origin}${s.url}` : s.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: 9 }}>Fetch JSON</a>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}