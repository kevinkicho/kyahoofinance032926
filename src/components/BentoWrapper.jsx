import React, { useState, useCallback } from 'react';
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
  try { localStorage.setItem(key, JSON.stringify(layout)); } catch {}
}

function mergeLayoutWithDefaults(saved, defaults) {
  const savedMap = new Map(saved.map(item => [item.i, item]));
  const seen = new Set();
  const merged = [];
  for (const def of defaults) {
    seen.add(def.i);
    if (savedMap.has(def.i)) {
      merged.push(savedMap.get(def.i));
    } else {
      merged.push({ ...def });
    }
  }
  for (const item of saved) {
    if (!seen.has(item.i)) {
      merged.push(item);
    }
  }
  return merged;
}

export default function BentoWrapper({ children, layout, className = "", storageKey, draggableHandle = ".bento-panel-title-row" }) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 });

  const [currentLayout, setCurrentLayout] = useState(() => {
    if (storageKey) {
      const saved = loadLayout(storageKey);
      if (saved) return mergeLayoutWithDefaults(saved, layout.lg);
    }
    return layout.lg;
  });

  const handleLayoutChange = useCallback((newLayout) => {
    setCurrentLayout(newLayout);
    if (storageKey) saveLayout(storageKey, newLayout);
  }, [storageKey]);

  if (!mounted) {
    return <div ref={containerRef} className={`com-bento-root ${className}`} style={{ minHeight: 400 }} />;
  }

  return (
    <div ref={containerRef} className={`com-bento-root ${className}`}>
      <ResponsiveGridLayout
        layouts={{ lg: currentLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        width={width}
        rowHeight={120}
        draggableHandle={draggableHandle}
        draggableCancel=".bento-panel-content,input,textarea,button,a,select"
        margin={[16, 16]}
        isResizable={true}
        useCSSTransforms={true}
        onLayoutChange={handleLayoutChange}
      >
        {children}
      </ResponsiveGridLayout>
    </div>
  );
}