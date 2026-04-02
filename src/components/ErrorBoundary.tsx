import React from 'react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    render() {
        if (this.state.error) {
            return this.props.fallback ?? (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '100vh', background: '#f7f8fa',
                    fontFamily: 'sans-serif', color: '#444', gap: 12,
                }}>
                    <div style={{ fontSize: 32 }}>⚠️</div>
                    <div style={{ fontWeight: 600 }}>Something went wrong</div>
                    <div style={{ fontSize: 13, color: '#888', maxWidth: 400, textAlign: 'center' }}>
                        {this.state.error.message}
                    </div>
                    <button
                        onClick={() => { this.setState({ error: null }); window.location.reload(); }}
                        style={{
                            marginTop: 8, padding: '8px 20px', border: '1px solid #ccc',
                            borderRadius: 6, cursor: 'pointer', background: 'white', fontSize: 13,
                        }}
                    >
                        Reload page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
