import React, { useState, useCallback, useEffect } from 'react';
import { useContainerWidth, ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

function loadLayout(key, fallback) {
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

export default function BentoWrapper({ children, layout, className = "", storageKey }) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 });

  const initialLayout = (() => {
    if (storageKey) {
      const saved = loadLayout(storageKey, layout.lg);
      if (saved) return saved;
    }
    return layout.lg;
  })();

  const [currentLayout, setCurrentLayout] = useState(initialLayout);

  const handleLayoutChange = useCallback((newLayout) => {
    setCurrentLayout(newLayout);
    if (storageKey) saveLayout(storageKey, newLayout);
  }, [storageKey]);

  useEffect(() => {
    if (storageKey) saveLayout(storageKey, currentLayout);
  }, [storageKey, currentLayout]);

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
        draggableHandle=".com-panel-title-row"
        draggableCancel=".com-panel-content,input,textarea,button,a,select"
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