import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useContainerWidth, ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './BentoWrapper.css';

function loadLayout(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch { return null; }
}

function saveLayout(key, layout) {
  try { localStorage.setItem(key, JSON.stringify(layout)); }
  catch (e) { console.warn(`[BentoWrapper] layout persist failed for "${key}":`, e?.message); }
}

function mergeLayoutWithDefaults(saved, defaults) {
  const savedMap = new Map(saved.map(item => [item.i, item]));
  const seen = new Set();
  const merged = [];
  for (const def of defaults) {
    seen.add(def.i);
    if (savedMap.has(def.i)) {
      // Preserve saved x/y/w/h but pick up minW/minH/maxW/maxH/static
      // changes from the default in case the schema evolved. Guard against
      // true synthetic saved sizes (w=1, h=1) — those happen when RGL renders
      // an item before its layout entry is in `layouts.lg`, then persists
      // the default 1×1 size; once written, the saved 1×1 would shadow
      // the real layout forever.
      const s = savedMap.get(def.i);
      const degenerate = s.w === 1 && s.h === 1 && (def.w !== 1 || def.h !== 1);
      if (degenerate) {
        merged.push({ ...def });
      } else {
        merged.push({ ...def, x: s.x, y: s.y, w: s.w, h: s.h });
      }
    } else {
      merged.push({ ...def });
    }
  }
  for (const item of saved) {
    if (!seen.has(item.i)) merged.push(item);
  }
  return merged;
}

export default function BentoWrapper({ children, layout, className = "", storageKey, draggableHandle = ".bento-panel-title-row" }) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 });
  const lastSavedRef = useRef(null);

  const [currentLayout, setCurrentLayout] = useState(() => {
    if (storageKey) {
      const saved = loadLayout(storageKey);
      if (saved) return mergeLayoutWithDefaults(saved, layout.lg);
    }
    return layout.lg;
  });

  // When the SET of layout keys changes (a new conditional panel appeared
  // or disappeared), re-merge against saved state so customizations stick
  // for existing items while newcomers land at their default positions.
  // Comparing the joined key list avoids the infinite render loop you'd
  // otherwise get when callers reconstruct `layout` on every render — the
  // array reference changes, but the key set usually doesn't.
  const layoutSig = (layout?.lg || []).map(i => i.i).join('|');
  const lastSigRef = useRef(layoutSig);
  useEffect(() => {
    if (!storageKey) return;
    if (lastSigRef.current === layoutSig) return;
    lastSigRef.current = layoutSig;
    const saved = loadLayout(storageKey);
    if (saved) setCurrentLayout(mergeLayoutWithDefaults(saved, layout.lg));
  }, [layoutSig, storageKey, layout]);

  const handleLayoutChange = useCallback((newLayout) => {
    // RGL synthesizes default 1×1 entries when a conditionally-rendered
    // child first appears (e.g. an async data panel). It then immediately
    // fires onLayoutChange with the synthesized 1×1 entry, which we'd
    // otherwise persist forever. Only reject true 1×1 synthetic entries;
    // deliberate compact user resizes are valid layout choices.
    const defaultsByKey = new Map((layout?.lg || []).map(d => [d.i, d]));
    const sanitized = newLayout.map(item => {
      const def = defaultsByKey.get(item.i);
      if (!def) return item;
      if (item.w === 1 && item.h === 1 && (def.w !== 1 || def.h !== 1)) {
        return { ...item, w: def.w, h: def.h, x: def.x, y: def.y };
      }
      return item;
    });
    setCurrentLayout(sanitized);
    if (storageKey) {
      saveLayout(storageKey, sanitized);
      lastSavedRef.current = sanitized;
    }
  }, [storageKey, layout]);

  // Defensive: flush latest layout on unmount (e.g., tab switch) so the
  // most recent state is persisted even if the last onLayoutChange fired
  // during a render that was interrupted.
  useEffect(() => {
    return () => {
      if (storageKey && lastSavedRef.current) {
        saveLayout(storageKey, lastSavedRef.current);
      }
    };
  }, [storageKey]);

  if (!mounted) {
    return <div ref={containerRef} className={`com-bento-root ${className}`} style={{ minHeight: 400 }} />;
  }

  return (
    <div ref={containerRef} className={`com-bento-root ${className}`}>
      <ResponsiveGridLayout
        layouts={{ lg: currentLayout, md: currentLayout, sm: currentLayout, xs: currentLayout, xxs: currentLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        // All breakpoints use 12 cols so a saved layout (built for lg)
        // never gets clamped by `correctBounds` when the container drops
        // below 1200px — RGL's findOrGenerateResponsiveLayout otherwise
        // reduces x when x+w exceeds breakpoint cols, which was wiping
        // the user's saved x-position on every reload.
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        width={width}
        rowHeight={120}
        draggableHandle={draggableHandle}
        draggableCancel=".bento-panel-content,input,textarea,button,a,select"
        margin={[16, 16]}
        isResizable={true}
        useCSSTransforms={true}
        onLayoutChange={handleLayoutChange}
      >
        {React.Children.map(children, child => {
          if (!React.isValidElement(child)) return child;
          const key = child.key;
          if (key) {
            const cleanedKey = String(key).replace(/^\.\$/, '');
            const isDomElement = typeof child.type === 'string';
            const extraProps = {};
            if (isDomElement) {
              extraProps['data-panel-key'] = child.props['data-panel-key'] || child.props.panelKey || cleanedKey;
            } else {
              extraProps.panelKey = child.props.panelKey || cleanedKey;
            }
            return React.cloneElement(child, extraProps);
          }
          return child;
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
