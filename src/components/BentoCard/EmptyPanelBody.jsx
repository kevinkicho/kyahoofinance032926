import React from 'react';

/**
 * Placeholder body when a panel has no usable data.
 * Stamped with data-panel-empty so BentoCard can auto-disable (opacity)
 * and panel-health can treat the slot as not displaying a stream.
 * When `loading`, do NOT stamp empty — progressive load should not look failed.
 */
export default function EmptyPanelBody({
  message = 'No data available',
  reason,
  loading = false,
}) {
  return (
    <div
      className={`bento-panel-empty${loading ? ' bento-panel-empty--loading' : ''}`}
      data-panel-empty={loading ? undefined : '1'}
      data-panel-loading={loading ? '1' : undefined}
      role="status"
      aria-live="polite"
    >
      <div className="bento-panel-empty-message">{message}</div>
      {reason && !loading ? <div className="bento-panel-empty-reason">{reason}</div> : null}
    </div>
  );
}
