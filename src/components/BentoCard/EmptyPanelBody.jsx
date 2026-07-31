import React from 'react';

/**
 * Placeholder body when a panel has no usable data.
 * Stamped with data-panel-empty so BentoCard can auto-disable (opacity)
 * and panel-health can treat the slot as not displaying a stream.
 */
export default function EmptyPanelBody({
  message = 'No data available',
  reason,
}) {
  return (
    <div
      className="bento-panel-empty"
      data-panel-empty="1"
      role="status"
      aria-live="polite"
    >
      <div className="bento-panel-empty-message">{message}</div>
      {reason ? <div className="bento-panel-empty-reason">{reason}</div> : null}
    </div>
  );
}
