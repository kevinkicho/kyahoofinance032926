import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { getEventsNear, MARKET_EVENTS } from '../../data/marketEvents';
import './TimeBar.css';

const DATA_START_STR = '2021-04-05';
const DATA_START     = new Date(DATA_START_STR);

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function addMonths(dateStr, n) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split('T')[0];
}
function addYears(dateStr, n) {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().split('T')[0];
}
function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}
function clamp(dateStr) {
  const endStr = getYesterday();
  if (dateStr < DATA_START_STR) return DATA_START_STR;
  if (dateStr > endStr) return endStr;
  return dateStr;
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}
function relLabel(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 1)  return 'yesterday';
  if (days < 7)   return `${days}d ago`;
  if (days < 31)  return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}yr ago`;
}

// Convert date string ↔ integer day (days since Unix epoch)
const dateToDay = (str) => Math.floor(new Date(str).getTime() / 86400000);
const dayToDate = (day) => new Date(day * 86400000).toISOString().split('T')[0];

// Speed config: [label, step-fn, interval-ms]
const SPEEDS = [
  { label: '▶',   step: d => addDays(d, 1),   ms: 900,  tip: 'Play — 1 day/step' },
  { label: '▶▶',  step: d => addDays(d, 7),   ms: 600,  tip: 'Fast — 1 week/step' },
  { label: '▶▶▶', step: d => addMonths(d, 1), ms: 350,  tip: 'Turbo — 1 month/step' },
];

// SlotDate: slot-machine animation when date changes
const SlotDate = ({ dateStr, dir }) => {
  const [shown, setShown] = useState(dateStr);
  const [anim, setAnim]   = useState('');
  const timerRef          = useRef(null);

  useEffect(() => {
    if (dateStr === shown) return;
    clearTimeout(timerRef.current);
    setAnim(dir === 'fwd' ? 'slot-out-up' : 'slot-out-down');
    timerRef.current = setTimeout(() => {
      setShown(dateStr);
      setAnim(dir === 'fwd' ? 'slot-in-down' : 'slot-in-up');
      timerRef.current = setTimeout(() => setAnim(''), 220);
    }, 140);
    return () => clearTimeout(timerRef.current);
  }, [dateStr]);

  return (
    <span className={`slot-date ${anim}`}>
      {shown ? formatDate(shown) : 'Live'}
    </span>
  );
};

// Timeline scrubber — horizontal drag-to-seek bar with event markers + hover tooltip
const Scrubber = ({ snapshotDate, setSnapshotDate, isPlaying, yesterday }) => {
  const minDay = dateToDay(DATA_START_STR);
  const maxDay = dateToDay(yesterday);
  const curDay = snapshotDate ? Math.min(dateToDay(snapshotDate), maxDay) : maxDay;

  const fillPct = ((curDay - minDay) / (maxDay - minDay)) * 100;

  const trackRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const handleChange = (e) => {
    const day     = parseInt(e.target.value);
    const dateStr = dayToDate(day);
    if (dateStr >= yesterday) setSnapshotDate(null);
    else setSnapshotDate(dateStr);
  };

  const handleMouseMove = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const hovDay = Math.round(minDay + pct * (maxDay - minDay));
    const hovDate = dayToDate(hovDay);
    // Find events within ±3 days of hovered date
    const nearby = MARKET_EVENTS.filter(ev => {
      const diff = Math.abs(dateToDay(ev.date) - hovDay);
      return diff <= 3 && ev.date >= DATA_START_STR && ev.date <= yesterday;
    });
    setTooltip({ pct: pct * 100, date: hovDate, events: nearby });
  };

  const handleMouseLeave = () => setTooltip(null);

  // Month / quarter / year tick marks
  const monthTicks = useMemo(() => {
    const ticks = [];
    // Iterate each month from DATA_START to yesterday
    let curr = new Date(new Date(DATA_START_STR).getFullYear(), new Date(DATA_START_STR).getMonth() + 1, 1);
    const end = new Date(yesterday);
    while (curr <= end) {
      const day = Math.floor(curr.getTime() / 86400000);
      const pct = (day - minDay) / (maxDay - minDay) * 100;
      const mo  = curr.getMonth();
      ticks.push({ pct, isYear: mo === 0, isQuarter: mo % 3 === 0 && mo !== 0 });
      curr = new Date(curr.getFullYear(), curr.getMonth() + 1, 1);
    }
    return ticks;
  }, [minDay, maxDay, yesterday]);

  // Year label positions (for the label row below)
  const years = [];
  for (let y = 2022; y <= 2026; y++) {
    const d = dateToDay(`${y}-01-01`);
    if (d > minDay && d < maxDay) {
      years.push({ label: String(y), pct: (d - minDay) / (maxDay - minDay) * 100 });
    }
  }

  // Event dot positions
  const dots = MARKET_EVENTS
    .filter(e => e.date >= DATA_START_STR && e.date <= yesterday)
    .map(e => ({
      pct: (dateToDay(e.date) - minDay) / (maxDay - minDay) * 100,
      title: `${e.date}  ${e.headline}`,
    }));

  return (
    <div className="tb-scrubber-wrap">
      <div
        className="tb-scrubber-track"
        ref={trackRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'relative' }}
      >
        <input
          type="range"
          className="tb-scrubber"
          min={minDay}
          max={maxDay}
          value={curDay}
          onChange={handleChange}
          disabled={isPlaying}
          style={{
            background: `linear-gradient(to right, #7c3aed ${fillPct}%, #1e293b ${fillPct}%)`
          }}
        />
        {/* Month / quarter / year ticks */}
        {monthTicks.map((tick, i) => (
          <div
            key={`tick-${i}`}
            className={`tb-scrubber-tick${tick.isYear ? ' tb-scrubber-tick--year' : tick.isQuarter ? ' tb-scrubber-tick--quarter' : ''}`}
            style={{ left: `${tick.pct}%` }}
          />
        ))}
        {/* Event marker dots */}
        {dots.map((dot, i) => (
          <div
            key={i}
            className="tb-scrubber-dot"
            style={{ left: `${dot.pct}%` }}
            title={dot.title}
          />
        ))}
        {/* Hover tooltip */}
        {tooltip && (
          <div
            className="tb-scrubber-tooltip"
            style={{ left: `${Math.min(Math.max(tooltip.pct, 2), 98)}%` }}
          >
            {tooltip.events.length > 0 && (
              <div className="tb-scrubber-tooltip-events">
                {tooltip.events.map((ev, i) => (
                  <div key={i} className="tb-scrubber-tooltip-event">
                    <span>{ev.emoji}</span>
                    <span className="tb-scrubber-tooltip-tag">{ev.tag || ev.headline}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="tb-scrubber-tooltip-date">{formatDate(tooltip.date)}</div>
          </div>
        )}
      </div>
      {/* Year labels */}
      <div className="tb-scrubber-labels">
        <span className="tb-scrubber-label" style={{ left: 0 }}>Apr 2021</span>
        {years.map(({ label, pct }) => (
          <span key={label} className="tb-scrubber-label" style={{ left: `${pct}%` }}>{label}</span>
        ))}
        <span className={`tb-scrubber-label tb-scrubber-label--live ${!snapshotDate ? 'active' : ''}`}
          style={{ right: 0, left: 'auto' }}>
          Live
        </span>
      </div>
    </div>
  );
};

const TimeBar = ({ snapshotDate, setSnapshotDate, snapshotLoading }) => {
  const yesterday   = getYesterday();
  const workingDate = snapshotDate || yesterday;

  const atStart = snapshotDate ? snapshotDate <= DATA_START_STR : false;
  const atEnd   = !snapshotDate;

  const [dir, setDir]       = useState('fwd');
  const [playIdx, setPlayIdx] = useState(null);
  const [expandedEventDate, setExpandedEventDate] = useState(null);
  const intervalRef  = useRef(null);
  const workingRef   = useRef(workingDate);
  workingRef.current = workingDate;

  // Hidden native date picker
  const dateInputRef = useRef(null);

  const navigate = useCallback((stepFn, direction) => {
    setDir(direction);
    const next = clamp(stepFn(workingRef.current));
    if (next >= yesterday) setSnapshotDate(null);
    else setSnapshotDate(next);
  }, [yesterday, setSnapshotDate]);

  const goLive = useCallback(() => {
    setDir('fwd');
    stopPlay();
    setSnapshotDate(null);
  }, [setSnapshotDate]);

  function stopPlay() {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setPlayIdx(null);
  }

  function startPlay(idx) {
    stopPlay();
    setPlayIdx(idx);
    const { step, ms } = SPEEDS[idx];
    intervalRef.current = setInterval(() => {
      const next = clamp(step(workingRef.current));
      if (next >= workingRef.current && workingRef.current >= yesterday) {
        stopPlay();
        setSnapshotDate(null);
        return;
      }
      setDir('fwd');
      if (next >= yesterday) { stopPlay(); setSnapshotDate(null); }
      else setSnapshotDate(next);
    }, ms);
  }

  useEffect(() => {
    if (!snapshotDate && playIdx !== null) stopPlay();
  }, [snapshotDate]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const handleSpeedBtn = (idx) => {
    if (playIdx === idx) {
      stopPlay();
    } else {
      if (!snapshotDate) {
        const startDate = clamp(addYears(yesterday, -1));
        setDir('fwd');
        setSnapshotDate(startDate);
        setTimeout(() => startPlay(idx), 100);
      } else {
        startPlay(idx);
      }
    }
  };

  const handleDateClick = () => {
    if (snapshotDate && dateInputRef.current) {
      try { dateInputRef.current.showPicker(); } catch (_) {}
    }
  };

  const handleDateInputChange = (e) => {
    const val = e.target.value;
    if (val) {
      setDir(val > (snapshotDate || yesterday) ? 'fwd' : 'back');
      setSnapshotDate(clamp(val));
    }
  };

  const nearbyEvents = useMemo(() => {
    if (!snapshotDate) return [];
    return getEventsNear(snapshotDate, 12, 4);
  }, [snapshotDate]);

  const isPlaying = playIdx !== null;

  const stepBtns = [
    { label: '‹ 1Y', fn: d => addYears(d, -1),  dir: 'back' },
    { label: '‹ 1M', fn: d => addMonths(d, -1), dir: 'back' },
    { label: '‹ 1W', fn: d => addDays(d, -7),   dir: 'back' },
    { label: '‹ 1D', fn: d => addDays(d, -1),   dir: 'back' },
  ];
  const fwdBtns = [
    { label: '1D ›', fn: d => addDays(d, 1),    dir: 'fwd' },
    { label: '1W ›', fn: d => addDays(d, 7),    dir: 'fwd' },
    { label: '1M ›', fn: d => addMonths(d, 1),  dir: 'fwd' },
    { label: '1Y ›', fn: d => addYears(d, 1),   dir: 'fwd' },
  ];

  return (
    <div className={`time-bar ${isPlaying ? 'time-bar--playing' : ''}`}>

      {/* Hidden native date picker */}
      <input
        ref={dateInputRef}
        type="date"
        value={snapshotDate || ''}
        min={DATA_START_STR}
        max={yesterday}
        onChange={handleDateInputChange}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />

      {/* ── Controls row ──────────────────────────────────────── */}
      <div className="tb-controls">

        {/* Step back */}
        <div className="tb-group">
          {stepBtns.map(b => (
            <button
              key={b.label}
              className="tb-btn tb-btn--back"
              disabled={atStart || snapshotLoading || isPlaying}
              onClick={() => navigate(b.fn, b.dir)}
            >{b.label}</button>
          ))}
        </div>

        {/* Center: date display */}
        <div className="tb-center">
          <div
            className={`tb-datebox ${snapshotDate && !snapshotLoading ? 'tb-datebox--clickable' : ''}`}
            onClick={handleDateClick}
            title={snapshotDate && !snapshotLoading ? 'Click to pick a date' : undefined}
          >
            {snapshotLoading ? (
              <span className="tb-loading">Loading…</span>
            ) : snapshotDate ? (
              <>
                <SlotDate dateStr={snapshotDate} dir={dir} />
                <span className="tb-ago">{relLabel(snapshotDate)}</span>
                <span className="tb-cal-hint">▾</span>
              </>
            ) : (
              <span className="tb-live-label">● Live</span>
            )}
          </div>
        </div>

        {/* Step forward + Live + Playback */}
        <div className="tb-group tb-group--right">
          {fwdBtns.map(b => (
            <button
              key={b.label}
              className="tb-btn tb-btn--fwd"
              disabled={atEnd || snapshotLoading || isPlaying}
              onClick={() => navigate(b.fn, b.dir)}
            >{b.label}</button>
          ))}

          <span className="tb-divider" />

          <button
            className={`tb-live-btn ${atEnd ? 'tb-live-btn--active' : ''}`}
            onClick={goLive}
            disabled={atEnd && !isPlaying}
            title="Jump to live"
          >Live</button>

          <span className="tb-divider" />

          {/* Play / Stop controls — kept right of Live */}
          {isPlaying && (
            <button className="tb-stop-btn" onClick={stopPlay} title="Stop playback">
              &#9632;
            </button>
          )}
          {SPEEDS.map((sp, idx) => (
            <button
              key={idx}
              className={`tb-speed-btn ${playIdx === idx ? 'tb-speed-btn--active' : ''}`}
              disabled={snapshotLoading && playIdx !== idx}
              onClick={() => handleSpeedBtn(idx)}
              title={sp.tip}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline scrubber ─────────────────────────────────── */}
      <Scrubber
        snapshotDate={snapshotDate}
        setSnapshotDate={setSnapshotDate}
        isPlaying={isPlaying}
        yesterday={yesterday}
      />

      {/* ── Events strip ─────────────────────────────────────── */}
      {snapshotDate && (
        <div className="tb-events">
          {nearbyEvents.length === 0 ? (
            <span className="tb-no-events">No notable events on record for this date</span>
          ) : (
            nearbyEvents.map((ev, i) => {
              const isExpanded = expandedEventDate === ev.date + i;
              return (
                <div
                  key={i}
                  className={`tb-event-chip ${isExpanded ? 'tb-event-chip--expanded' : ''}`}
                  onClick={() => setExpandedEventDate(isExpanded ? null : ev.date + i)}
                >
                  <span className="tb-event-chip-emoji">{ev.emoji}</span>
                  <span className="tb-event-chip-tag">{ev.tag || ev.headline}</span>
                  <span className="tb-event-chip-arrow">{isExpanded ? '▾' : '▸'}</span>
                  {isExpanded && (
                    <div className="tb-event-chip-detail">
                      <span className="tb-event-chip-headline">{ev.headline}</span>
                      <span className="tb-event-chip-body">{ev.body}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default TimeBar;
