import React from 'react';

type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, details: React.ErrorInfo) {
    console.error('Frontend page error', error, details.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-main)' }}><section className="hne-card" role="alert" style={{ maxWidth: 520, textAlign: 'center' }}><h1 style={{ fontSize: 22 }}>This page could not be displayed</h1><p style={{ margin: '12px 0 20px', color: 'var(--text-secondary)' }}>Your data is safe. Reload the page to retry, or return to the dashboard.</p><div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}><button className="hne-btn hne-btn-secondary" onClick={() => window.location.assign('/')}>Home</button><button className="hne-btn hne-btn-primary" onClick={() => window.location.reload()}>Reload page</button></div></section></main>;
  }
}
