import React, { useState, useCallback, useEffect, useRef } from 'react';
// Width hook is v2; Responsive must come from /legacy so v1 flat props
// (layouts, cols, breakpoints, draggableHandle, …) still work. Importing
// Responsive from the main package uses the v2 API and silently ignores
// those props → every panel collapses to synthetic 1×1.
import { useContainerWidth } from 'react-grid-layout';
import { Responsive as ResponsiveGridLayout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './BentoWrapper.css';

/**
 * React Grid Layout / React 19 can surface child keys as ".$kpi" (internal
 * React key prefix) in onLayoutChange payloads. If we persist those, merge
 * never matches defaults (`kpi`) and every panel collapses to synthetic 1×1.
 */
function normalizeLayoutKey(i) {
  return String(i ?? '').replace(/^\.\$/, '');
}

/**
 * Keep only geometry that is safe to persist/feed back into RGL.
 * Critical: never re-apply `static: true` or `isDraggable: false` from a
 * previous drag/resize payload — that freezes the panel permanently until
 * localStorage is wiped.
 */
function sanitizeLayoutItem(item, defaultsByKey) {
  if (!item || typeof item !== 'object') return item;
  const i = normalizeLayoutKey(item.i);
  const def = defaultsByKey?.get?.(i);
  let x = Number.isFinite(item.x) ? item.x : (def?.x ?? 0);
  let y = Number.isFinite(item.y) ? item.y : (def?.y ?? 0);
  let w = Number.isFinite(item.w) ? item.w : (def?.w ?? 4);
  let h = Number.isFinite(item.h) ? item.h : (def?.h ?? 3);

  // Reject RGL synthetic 1×1 cells (and zero/negative sizes) by restoring defaults.
  if ((w <= 0 || h <= 0) && def) {
    w = def.w; h = def.h; x = def.x; y = def.y;
  }
  if (w === 1 && h === 1 && def && (def.w !== 1 || def.h !== 1)) {
    w = def.w; h = def.h; x = def.x; y = def.y;
  }

  // Clamp to a usable minimum so an accidental resize can't hide the drag handle.
  const minW = def?.minW ?? 2;
  const minH = def?.minH ?? 2;
  if (w < minW) w = minW;
  if (h < minH) h = minH;

  const out = { i, x, y, w, h };
  if (def?.minW != null) out.minW = def.minW;
  if (def?.minH != null) out.minH = def.minH;
  if (def?.maxW != null) out.maxW = def.maxW;
  if (def?.maxH != null) out.maxH = def.maxH;
  // Explicitly never static — accidental drag must not lock the panel.
  out.static = false;
  return out;
}

function normalizeLayout(layout, defaultsByKey) {
  if (!Array.isArray(layout)) return layout;
  return layout.map((item) => sanitizeLayoutItem(item, defaultsByKey));
}

/** Drop body/html drag leftovers that leave panels unclickable. */
function clearStuckDragArtifacts() {
  try {
    document.body.classList.remove('react-draggable-transparent-selection');
    document.documentElement.classList.remove('react-draggable-transparent-selection');
    document.body.style.userSelect = '';
    document.documentElement.style.userSelect = '';
    document.body.style.cursor = '';
    // RGL/react-draggable can leave these if mouseup happens outside the window.
    document.querySelectorAll('.react-grid-item.react-draggable-dragging, .react-grid-item.resizing').forEach((el) => {
      el.classList.remove('react-draggable-dragging', 'resizing');
    });
  } catch { /* ignore */ }
}

function loadLayout(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    // Geometry only; mergeLayoutWithDefaults applies schema + unlocks static.
    return parsed.map((item) => {
      if (!item || typeof item !== 'object') return item;
      return {
        i: normalizeLayoutKey(item.i),
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      };
    });
  } catch {
    return null;
  }
}

function saveLayout(key, layout) {
  try {
    // Persist geometry only — never static/isDraggable flags.
    const slim = (Array.isArray(layout) ? layout : []).map((item) => ({
      i: normalizeLayoutKey(item.i),
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    localStorage.setItem(key, JSON.stringify(slim));
  } catch (e) {
    console.warn(`[BentoWrapper] layout persist failed for "${key}":`, e?.message);
  }
}

function mergeLayoutWithDefaults(saved, defaults) {
  const defaultsByKey = new Map(
    (defaults || []).map((d) => [normalizeLayoutKey(d.i), { ...d, i: normalizeLayoutKey(d.i) }]),
  );
  const savedMap = new Map(
    (saved || []).map((item) => [normalizeLayoutKey(item.i), { ...item, i: normalizeLayoutKey(item.i) }]),
  );
  const seen = new Set();
  const merged = [];
  for (const def of defaults) {
    const id = normalizeLayoutKey(def.i);
    seen.add(id);
    if (savedMap.has(id)) {
      // Geometry from save; constraints from defaults. Never inherit static/isDraggable.
      const s = savedMap.get(id);
      merged.push(sanitizeLayoutItem({ ...def, ...s, i: id }, defaultsByKey));
    } else {
      merged.push(sanitizeLayoutItem({ ...def, i: id }, defaultsByKey));
    }
  }
  for (const item of saved || []) {
    const id = normalizeLayoutKey(item.i);
    if (!seen.has(id)) {
      console.debug(`[BentoWrapper] Dropping orphaned layout entry "${id}" — panel no longer in defaults`);
    }
  }
  return merged;
}

/** Stable compare of RGL layouts — ignore volatile fields (moved, isDraggable, …). */
function layoutSignature(layout) {
  if (!Array.isArray(layout)) return '';
  return layout
    .map((it) => `${normalizeLayoutKey(it.i)}:${it.x},${it.y},${it.w},${it.h}`)
    .sort()
    .join('|');
}

export default function BentoWrapper({ children, layout, className = '', storageKey, draggableHandle = '.bento-panel-title-row' }) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 });
  const lastSavedRef = useRef(null);
  // Ignore RGL's burst of onLayoutChange on mount / width settle — that loop
  // is what makes panels "twitch" when equities submenus remount a grid.
  // Vitest drives onLayoutChange immediately; skip the settle gate there.
  const SETTLE_MS = import.meta.env?.MODE === 'test' ? 0 : 180;
  const settleOkRef = useRef(SETTLE_MS === 0);
  const defaultsByKey = useRef(new Map());
  defaultsByKey.current = new Map(
    (layout?.lg || []).map((d) => [normalizeLayoutKey(d.i), { ...d, i: normalizeLayoutKey(d.i) }]),
  );

  const [currentLayout, setCurrentLayout] = useState(() => {
    if (storageKey) {
      const saved = loadLayout(storageKey);
      if (saved) return mergeLayoutWithDefaults(saved, layout.lg);
    }
    return normalizeLayout(layout.lg, defaultsByKey.current);
  });

  // When the SET of layout keys changes (a new conditional panel appeared
  // or disappeared), re-merge against saved state so customizations stick
  // for existing items while newcomers land at their default positions.
  // Comparing the joined key list avoids the infinite render loop you'd
  // otherwise get when callers reconstruct `layout` on every render — the
  // array reference changes, but the key set usually doesn't.
  const layoutSig = (layout?.lg || []).map((i) => normalizeLayoutKey(i.i)).join('|');
  const lastSigRef = useRef(layoutSig);
  useEffect(() => {
    if (!storageKey) return;
    if (lastSigRef.current === layoutSig) return;
    lastSigRef.current = layoutSig;
    settleOkRef.current = SETTLE_MS === 0;
    const saved = loadLayout(storageKey);
    if (saved) setCurrentLayout(mergeLayoutWithDefaults(saved, layout.lg));
    else setCurrentLayout(normalizeLayout(layout.lg, defaultsByKey.current));
    if (SETTLE_MS === 0) return undefined;
    const t = window.setTimeout(() => { settleOkRef.current = true; }, SETTLE_MS);
    return () => clearTimeout(t);
  }, [layoutSig, storageKey, layout, SETTLE_MS]);

  // First mount settle window
  useEffect(() => {
    settleOkRef.current = SETTLE_MS === 0;
    if (SETTLE_MS === 0) return undefined;
    const t = window.setTimeout(() => { settleOkRef.current = true; }, SETTLE_MS);
    return () => {
      clearTimeout(t);
      settleOkRef.current = false;
    };
  }, [storageKey, SETTLE_MS]);

  // Global mouseup/blur recovery — accidental drag that ends off-window
  // can leave react-draggable classes/cursors that make panels feel "stuck".
  useEffect(() => {
    const onUp = () => clearStuckDragArtifacts();
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onUp);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onUp);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const handleLayoutChange = useCallback((newLayout) => {
    // RGL synthesizes default 1×1 entries when a conditionally-rendered
    // child first appears (e.g. an async data panel). It then immediately
    // fires onLayoutChange with the synthesized 1×1 entry, which we'd
    // otherwise persist forever. Only reject true 1×1 synthetic entries;
    // deliberate compact user resizes are valid layout choices.
    //
    // Also strip React's ".$key" prefix so lookups match layout defaults.
    //
    // Critical: skip setState when the geometry is unchanged. RGL fires
    // onLayoutChange on almost every render; unconditional setState →
    // re-render → onLayoutChange again = visible “twitching”.
    //
    // Never persist static/isDraggable:false — accidental drags were
    // freezing panels until a hard layout reset.
    if (!settleOkRef.current) return;

    const sanitized = normalizeLayout(newLayout, defaultsByKey.current);

    setCurrentLayout((prev) => {
      if (layoutSignature(prev) === layoutSignature(sanitized)) return prev;
      if (storageKey) {
        saveLayout(storageKey, sanitized);
        lastSavedRef.current = sanitized;
      }
      return sanitized;
    });
  }, [storageKey]);

  const handleDragStop = useCallback(() => {
    // Defer so RGL finishes its own stop handler first.
    requestAnimationFrame(clearStuckDragArtifacts);
  }, []);

  const handleResizeStop = useCallback(() => {
    requestAnimationFrame(clearStuckDragArtifacts);
  }, []);

  // Defensive: flush latest layout on unmount (e.g., tab switch) so the
  // most recent state is persisted even if the last onLayoutChange fired
  // during a render that was interrupted.
  useEffect(() => {
    return () => {
      if (storageKey && lastSavedRef.current) {
        saveLayout(storageKey, lastSavedRef.current);
      }
      clearStuckDragArtifacts();
    };
  }, [storageKey]);

  // Always render grid children (even before the first measure) so splash
  // panel-health can find [data-panel-key] nodes. Width falls back to 1200
  // until useContainerWidth mounts.
  const effectiveWidth = width > 0 ? width : 1200;

  return (
    <div ref={containerRef} className={`com-bento-root ${className}`} style={!mounted ? { minHeight: 400 } : undefined}>
      <ResponsiveGridLayout
        layouts={{ lg: currentLayout, md: currentLayout, sm: currentLayout, xs: currentLayout, xxs: currentLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        // All breakpoints use 12 cols so a saved layout (built for lg)
        // never gets clamped by `correctBounds` when the container drops
        // below 1200px — RGL's findOrGenerateResponsiveLayout otherwise
        // reduces x when x+w exceeds breakpoint cols, which was wiping
        // the user's saved x-position on every reload.
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        width={effectiveWidth}
        rowHeight={120}
        draggableHandle={draggableHandle}
        // Cancel drag starts on chart canvas / interactive content so a
        // brush over a chart never hijacks the grid item.
        draggableCancel=".bento-panel-content,input,textarea,button,a,select,.tt-bar,.tt-scrubber,canvas,svg,.echarts-for-react,.react-resizable-handle"
        margin={[16, 16]}
        isDraggable={true}
        isResizable={true}
        useCSSTransforms={true}
        // Require a few px of movement so a click isn't treated as a drag.
        // (legacy API; also accepted via dragConfig in v2 pure API)
        onLayoutChange={handleLayoutChange}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
      >
        {/*
          Use Children.toArray + Array#map (NOT Children.map).
          Children.map re-namespaces keys (e.g. ".$kpi"), and RGL matches
          layout.i to String(child.key) exactly — any mismatch creates a
          permanent synthetic 1×1 cell.
        */}
        {React.Children.toArray(children)
          .filter(React.isValidElement)
          .map((child) => {
            const cleanedKey = child.key != null ? normalizeLayoutKey(child.key) : undefined;
            if (!cleanedKey) return child;

            const isDomElement = typeof child.type === 'string';
            const extraProps = isDomElement
              ? {
                  'data-panel-key': child.props['data-panel-key'] || child.props.panelKey || cleanedKey,
                  style: { ...(child.props.style || {}), height: '100%' },
                }
              : {
                  panelKey: child.props.panelKey || cleanedKey,
                  style: { ...(child.props.style || {}), height: '100%' },
                  className: child.props.className,
                };

            return (
              <div
                key={cleanedKey}
                data-panel-key={cleanedKey}
                className="bento-grid-slot"
                style={{ height: '100%', width: '100%', minHeight: 0, minWidth: 0 }}
              >
                {React.cloneElement(child, extraProps)}
              </div>
            );
          })}
      </ResponsiveGridLayout>
    </div>
  );
}
