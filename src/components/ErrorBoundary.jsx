import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, componentStack: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(err, info) {
    console.error(`[ErrorBoundary - ${this.props.name || 'Component'}] crashed:`, err, info);
    this.setState({ componentStack: info?.componentStack || null });
  }

  componentDidUpdate(prevProps) {
    // If name/key changes, clear error state to attempt fresh mount
    if (this.state.error && prevProps.name !== this.props.name) {
      this.setState({ error: null, componentStack: null });
    }
  }

  render() {
    const { error, componentStack } = this.state;
    const { type = 'tab', name = 'Component', children } = this.props;

    if (error) {
      if (type === 'global') {
        return (
          <div style={{ padding: 40, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            <h3>Something went wrong in the {name}.</h3>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
              Reload Page
            </button>
          </div>
        );
      }

      const stackLines = (componentStack || '').split('\n').filter(l => l.trim()).slice(0, 3);
      const fullStack = componentStack || '';

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>
          <span style={{ fontSize: 28 }}>&#9888;</span>
          <span><strong>{name}</strong> failed to load.</span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', maxWidth: 400, textAlign: 'center', wordBreak: 'break-word' }}>{error.message}</span>
          {stackLines.length > 0 && (
            <pre style={{ fontSize: 9, color: 'var(--text-dim)', background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: 4, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, lineHeight: 1.4 }}>{stackLines.join('\n')}</pre>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => this.setState({ error: null, componentStack: null })} style={{ padding: '4px 14px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
              Retry
            </button>
            {fullStack && (
              <button onClick={() => { navigator.clipboard.writeText(`${error?.stack || error?.message}\n\nComponent stack:\n${fullStack}`); }} style={{ padding: '4px 14px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 11 }}>
                Copy Stack
              </button>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}
