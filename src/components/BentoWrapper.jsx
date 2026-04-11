import React, { useState, useCallback } from 'react';
import { useContainerWidth, ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export default function BentoWrapper({ children, layout, className = "" }) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 });
  const [currentLayout, setCurrentLayout] = useState(layout.lg);

  const handleLayoutChange = useCallback((newLayout) => {
    setCurrentLayout(newLayout);
  }, []);

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