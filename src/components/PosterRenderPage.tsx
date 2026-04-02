// Headless render target — opened by the Puppeteer renderer (server/services/renderLocal.js)
// Usage: /render?token=ABC123
//
// Loads the design state from the API, renders the poster SVG at full print resolution,
// exports it to a PNG data URL, and signals completion via:
//   - document.body.setAttribute('data-render-ready', 'true')
//   - window.__posterPng = '<base64 PNG string>'

import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import VectorStarMap from './VectorStarMap';
import { renderPosterToBlob } from '../utils/renderPoster';

declare global {
    interface Window {
        __posterPng?: string;
    }
}

const API_URL = import.meta.env.VITE_API_URL || '';

// UI-only fields that shouldn't be restored (zoom, pan, editing state, etc.)
const UI_ONLY_FIELDS = new Set([
    'previewZoom', 'previewPanX', 'previewPanY',
    'isInlineEditing', 'activeTypoField', 'pendingGlyphForInlineEdit',
    'templateSettings', 'templateDefaults',
]);

// Apply a saved design state to the Zustand store directly (bypasses setters that
// would recalculate dependent values like font sizes from printSize).
function applyDesignState(state: Record<string, unknown>) {
    const patch: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(state)) {
        if (UI_ONLY_FIELDS.has(key)) continue;
        if (value === undefined) continue;
        // Convert serialised date string back to Date object
        if (key === 'date' && typeof value === 'string') {
            patch[key] = new Date(value);
            continue;
        }
        patch[key] = value;
    }

    useStore.setState(patch as Partial<ReturnType<typeof useStore.getState>>);
}

const PosterRenderPage: React.FC = () => {
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { printSize } = useStore();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (!token) {
            setError('No token provided');
            return;
        }

        fetch(`${API_URL}/api/design/${token}`)
            .then(res => {
                if (!res.ok) throw new Error(`Design not found: ${res.status}`);
                return res.json();
            })
            .then(state => {
                applyDesignState(state);
                setReady(true);
            })
            .catch(err => {
                console.error('[PosterRenderPage] Failed to load design:', err);
                setError(err.message);
                document.body.setAttribute('data-render-error', err.message);
            });
    }, []);

    // Once the SVG is rendered, export it to PNG and signal completion
    useEffect(() => {
        if (!ready) return;

        // Give the SVG rendering a moment to settle (star data fetch + D3 paint)
        const timer = setTimeout(async () => {
            try {
                const svgEl = document.querySelector('#poster-render svg') as SVGSVGElement | null;
                if (!svgEl) throw new Error('SVG element not found');

                const blob = await renderPosterToBlob(
                    svgEl,
                    printSize.width,
                    printSize.height,
                    300,
                    false  // no watermark for order renders
                );

                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result as string;
                    window.__posterPng = dataUrl.replace(/^data:image\/png;base64,/, '');
                    document.body.setAttribute('data-render-ready', 'true');
                    console.log('[PosterRenderPage] Render complete');
                };
                reader.readAsDataURL(blob);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error('[PosterRenderPage] Export failed:', msg);
                document.body.setAttribute('data-render-error', msg);
            }
        }, 3500); // 3.5s for star data + D3 render

        return () => clearTimeout(timer);
    }, [ready, printSize]);

    if (error) {
        return (
            <div style={{ padding: 20, fontFamily: 'monospace', color: 'red' }}>
                Render error: {error}
            </div>
        );
    }

    if (!ready) {
        return (
            <div style={{ padding: 20, fontFamily: 'monospace', color: '#666' }}>
                Loading design...
            </div>
        );
    }

    return (
        // Render the poster at its natural SVG size (1200px wide)
        <div
            id="poster-render"
            style={{
                width: '1200px',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
            }}
        >
            <VectorStarMap />
        </div>
    );
};

export default PosterRenderPage;
