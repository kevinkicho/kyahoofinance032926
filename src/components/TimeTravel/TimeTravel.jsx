import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getAllDatesFor, getSnapshot } from '../../utils/snapshotDB';
import { useInterval } from '../../hooks/useInterval';
import { useDataContext } from '../../hub/DataContext';
import './TimeTravel.css';

const MACRO_EVENTS = [
  { date: '2020-02-19', label: 'S&P Peak', cat: 'crisis' },
  { date: '2020-03-23', label: 'COVID Low', cat: 'crisis' },
  { date: '2020-03-25', label: 'CARES Act', cat: 'policy' },
  { date: '2020-08-27', label: 'Powell: Avg Infl', cat: 'policy' },
  { date: '2020-11-09', label: 'Vaccine OK', cat: 'crisis' },
  { date: '2021-01-06', label: 'GA Senate', cat: 'policy' },
  { date: '2021-01-28', label: 'GME Squeeze', cat: 'crisis' },
  { date: '2021-03-17', label: 'Fed: rates 0', cat: 'policy' },
  { date: '2021-06-16', label: 'Dot Plot Hawk', cat: 'policy' },
  { date: '2021-11-03', label: 'Taper Starts', cat: 'policy' },
  { date: '2022-03-16', label: '1st Hike 25bp', cat: 'hike' },
  { date: '2022-05-04', label: '2nd Hike 50bp', cat: 'hike' },
  { date: '2022-06-15', label: '3rd Hike 75bp', cat: 'hike' },
  { date: '2022-07-27', label: '4th Hike 75bp', cat: 'hike' },
  { date: '2022-09-21', label: '5th Hike 75bp', cat: 'hike' },
  { date: '2022-11-02', label: '6th Hike 75bp', cat: 'hike' },
  { date: '2022-12-14', label: '7th Hike 50bp', cat: 'hike' },
  { date: '2023-02-01', label: '8th Hike 25bp', cat: 'hike' },
  { date: '2023-03-12', label: 'SVB Collapse', cat: 'crisis' },
  { date: '2023-03-22', label: '9th Hike 25bp', cat: 'hike' },
  { date: '2023-05-10', label: '10th Hike 25bp', cat: 'hike' },
  { date: '2023-07-26', label: '11th Hike 25bp', cat: 'hike' },
  { date: '2023-10-07', label: 'Israel-Gaza', cat: 'crisis' },
  { date: '2023-12-13', label: 'Fed Pivot', cat: 'policy' },
  { date: '2024-03-07', label: 'BTC $70K', cat: 'crisis' },
  { date: '2024-07-31', label: 'BOJ Hike', cat: 'hike' },
  { date: '2024-08-05', label: 'Carry Unwind', cat: 'crisis' },
  { date: '2024-09-18', label: '1st Cut 50bp', cat: 'policy' },
  { date: '2024-11-06', label: 'US Election', cat: 'policy' },
  { date: '2024-12-18', label: 'Hawkish Cut', cat: 'policy' },
  { date: '2025-01-20', label: 'Inauguration', cat: 'policy' },
  { date: '2025-04-02', label: 'Liberation Day', cat: 'policy' },
  { date: '2025-04-09', label: '90d Pause', cat: 'policy' },
  { date: '2025-07-01', label: 'Big Beautiful Bill', cat: 'policy' },
  { date: '2025-10-01', label: 'Fed Cuts Resume', cat: 'policy' },
  { date: '2026-01-15', label: 'Q4 Earnings', cat: 'earnings' },
  { date: '2026-03-15', label: 'Fed: Hold', cat: 'policy' },
  { date: '2026-04-14', label: 'Q1 Earnings', cat: 'earnings' },
];

const SPEED_MS = { 1: 1500, 2: 750, 4: 375 };

const CAT_COLOR = {
  crisis: '#ef4444',
  policy: '#3b82f6',
  hike: '#f59e0b',
  earnings: '#22c55e',
};

export default function TimeTravel({ onSnapshotSelect, isActive }) {
  const ctx = (() => { try { return useDataContext(); } catch { return null; } })();
  const setHistoricalDate = ctx?.setHistoricalDate || (() => {});
  const [dates, setDates] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loadedSnap, setLoadedSnap] = useState(null);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    getAllDatesFor('equities').then(d => {
      if (d.length) setDates(d.sort());
    });
  }, []);

  useEffect(() => {
    if (!isActive) {
      setPlaying(false);
      setIdx(-1);
      setLoadedSnap(null);
    }
  }, [isActive]);

  // On unmount (user leaves Bar Race), always restore live quotes so List /
  // Heatmap don't keep a historical snapshot from the scrubber.
  useEffect(() => {
    return () => {
      onSnapshotSelect(null, null, null);
      setHistoricalDate(null);
    };
  }, [onSnapshotSelect, setHistoricalDate]);

  const loadDate = useCallback(async (date) => {
    const snap = await getSnapshot('equities', date);
    if (snap?.data?.quotes) {
      setLoadedSnap(snap);
      onSnapshotSelect(snap.data.quotes, date, snap.stamp);
      // Drive global historical date so other markets/tabs (via DataProvider RTDB) reflect the same day.
      setHistoricalDate(date);
    }
  }, [onSnapshotSelect, setHistoricalDate]);

  useEffect(() => {
    if (idx < 0 || idx >= dates.length) return;
    loadDate(dates[idx]);
  }, [idx, dates, loadDate]);

  useInterval(() => {
    if (!playing || idx < 0) return;
    const next = idx + 1;
    if (next >= dates.length) { setPlaying(false); return; }
    setIdx(next);
  }, playing ? SPEED_MS[speed] : null);

  const handleScrub = (e) => {
    const val = Number(e.target.value);
    setIdx(val);
    setPlaying(false);
  };

  const handlePlay = () => {
    if (!dates.length) return;
    if (idx < 0) setIdx(0);
    setPlaying(v => !v);
  };

  const handleReset = () => {
    setPlaying(false);
    setIdx(-1);
    setLoadedSnap(null);
    onSnapshotSelect(null, null, null);
    // Clear global historical so app returns to live/latest across all markets.
    setHistoricalDate(null);
  };

  const currentDate = idx >= 0 && idx < dates.length ? dates[idx] : null;

  const relevantEvents = useMemo(() => {
    if (!dates.length) return [];
    const first = dates[0];
    const last = dates[dates.length - 1];
    return MACRO_EVENTS.filter(e => e.date >= first && e.date <= last);
  }, [dates]);

  const eventMarkers = useMemo(() => {
    if (!dates.length) return [];
    return relevantEvents.map(ev => {
      const di = dates.findIndex(d => d >= ev.date);
      if (di < 0) return null;
      return { idx: di, ...ev };
    }).filter(Boolean);
  }, [dates, relevantEvents]);

  return (
    <div className={`tt-bar ${isActive ? 'tt-bar--active' : ''}`}>
      <div className="tt-controls">
        <button className="tt-btn tt-play" onClick={handlePlay} title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        {[1, 2, 4].map(s => (
          <button
            key={s}
            className={`tt-btn tt-speed ${speed === s ? 'active' : ''}`}
            onClick={() => setSpeed(s)}
          >{s}x</button>
        ))}
        <button className="tt-btn tt-reset" onClick={handleReset} title="Reset to live">⏹</button>
      </div>

      <div className="tt-timeline">
        <input
          type="range"
          className="tt-scrubber"
          min={0}
          max={Math.max(dates.length - 1, 0)}
          value={idx >= 0 ? idx : 0}
          onChange={handleScrub}
          disabled={!dates.length}
        />
        <div className="tt-event-track">
          {eventMarkers.map(ev => (
            <div
              key={ev.date + ev.label}
              className="tt-event-dot"
              style={{
                left: `${dates.length > 1 ? (ev.idx / (dates.length - 1)) * 100 : 0}%`,
                background: CAT_COLOR[ev.cat] || '#64748b',
              }}
              title={`${ev.date}: ${ev.label}`}
            />
          ))}
        </div>
      </div>

      <div className="tt-info">
        {currentDate ? (
          <span className="tt-date-label">
            {currentDate}
            {loadedSnap?.stamp && <span className="tt-stamp">{loadedSnap.stamp}</span>}
            <span className="tt-global-hint" title="Sets historical view across the whole app (other tabs pull RTDB snapshots for this date)"> · app-wide</span>
          </span>
        ) : (
          <span className="tt-date-label tt-placeholder">
            {dates.length ? 'Drag scrubber or press ▶ (affects whole app via RTDB)' : 'No cached snapshots yet — fetch data first'}
          </span>
        )}
      </div>

      <div className="tt-legend">
        {Object.entries(CAT_COLOR).map(([cat, col]) => (
          <span key={cat} className="tt-legend-item">
            <span className="tt-legend-dot" style={{ background: col }} />
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}
