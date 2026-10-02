import { Component } from 'react';
import { APP_NAME } from '../../config/constants.js';

/** @typedef {Object} ErrorBoundaryState */
/** @property {boolean} hasError */

/** @typedef {Object} ErrorBoundaryProps */
/** @property {React.ReactNode} [children] */
/** @property {React.ReactNode} [fallback] */

/**
 * Global error boundary that prevents a single component failure from
 * triggering a White Screen of Death. Catches render-time errors via
 * getDerivedStateFromError and reports them in componentDidCatch.
 *
 * Elevated roles / sensitive actions are never affected: this only governs
 * UI rendering resilience. The fallback matches the app's light theme.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Render error caught:', error, info);
  }

  handleReset() {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100dvh',
            width: '100vw',
            background: 'var(--bg-app)',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            margin: 0,
            padding: '2rem 1.5rem',
            boxSizing: 'border-box',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              flexShrink: 0,
              borderRadius: '50%',
              background: 'var(--brand-subtle)',
              border: '1px solid var(--border-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s ease-in-out infinite',
            }}
            aria-hidden="true"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: 'var(--brand)' }}
            >
              <path
                d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                color="var(--brand)"
                fill="none"
              />
              <path
                d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
                stroke="var(--text-secondary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>

          <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.75rem' }}>
            Oops! Something went wrong
          </h1>
          <p style={{ margin: 0, maxWidth: '32rem', fontSize: '0.95rem' }}>
            A problem occurred while rendering the {APP_NAME} interface. Your
            data is safe. Reload the page to try again, or return home to start
            over.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--brand)',
                background: 'var(--brand)',
                color: 'var(--brand-on)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'background 0.15s ease',
              }}
            >
              Refresh Page
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = '/')}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'border-color 0.15s ease',
              }}
            >
              Go to Home
            </button>
          </div>

          {this.state.hasError ? (
            <button
              type="button"
              onClick={() => this.handleReset()}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}
