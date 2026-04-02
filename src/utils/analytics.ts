// Lightweight analytics utility — sends events to our own backend.
// No third-party trackers. No PII stored.

const API = import.meta.env.VITE_API_URL || '';

// Generate a session ID (session-scoped, not persistent across sessions)
function getSessionId(): string {
    let id = sessionStorage.getItem('_sid');
    if (!id) {
        id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        sessionStorage.setItem('_sid', id);
    }
    return id;
}

export function trackEvent(name: string, props?: Record<string, unknown>): void {
    // Fire and forget — never block the UI
    try {
        fetch(`${API}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, props, sessionId: getSessionId() }),
            keepalive: true,
        }).catch(() => {});
    } catch { /* ignore */ }
}
