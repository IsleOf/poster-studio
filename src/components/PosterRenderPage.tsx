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
import StreetMapCapture from './StreetMapCapture';
import { renderPosterToBlob } from '../utils/renderPoster';
import { calculateMapExportTarget } from '../utils/mapExportSizing';

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
    const [mapReady, setMapReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const renderStartedRef = React.useRef(false);
    const {
        printSize, posterType, captureHighResFn, setMapBackgroundImage,
        maskShape, circleSize, heartSize, houseSize,
    } = useStore();

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

    useEffect(() => {
        if (!ready) return;
        if (posterType === 'starmap') {
            setMapBackgroundImage(null);
            setMapReady(true);
            return;
        }
        setMapReady(false);
    }, [ready, posterType, setMapBackgroundImage]);

    useEffect(() => {
        if (!ready || posterType === 'starmap' || !captureHighResFn) return;

        let cancelled = false;
        const prepareMap = async () => {
            try {
                const target = calculateMapExportTarget({
                    printSize,
                    dpi: 300,
                    maskShape,
                    circleSize,
                    heartSize,
                    houseSize,
                });
                const highResUrl = await captureHighResFn({
                    targetPx: target.targetPx,
                    detailScale: target.detailScale,
                });

                if (cancelled) return;
                await new Promise<void>(resolve => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = highResUrl;
                });

                if (cancelled) return;
                setMapBackgroundImage(highResUrl);
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                if (!cancelled) setMapReady(true);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error('[PosterRenderPage] High-res map capture failed:', msg);
                setError(`High-res map capture failed: ${msg}`);
                document.body.setAttribute('data-render-error', msg);
            }
        };

        prepareMap();
        return () => {
            cancelled = true;
        };
    }, [ready, posterType, captureHighResFn, printSize, maskShape, circleSize, heartSize, houseSize, setMapBackgroundImage]);

    // Once the SVG and high-resolution map image are ready, export it to PNG and signal completion
    useEffect(() => {
        if (!ready || !mapReady || renderStartedRef.current) return;
        renderStartedRef.current = true;

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
        }, posterType === 'starmap' ? 3500 : 500); // maps are explicitly prepared above

        return () => clearTimeout(timer);
    }, [ready, mapReady, printSize, posterType]);

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

    const hiddenMapCapture = posterType !== 'starmap' ? (
        <div
            style={{
                position: 'fixed',
                left: '-9999px',
                top: 0,
                width: '1200px',
                height: '1200px',
                pointerEvents: 'none',
            }}
            aria-hidden="true"
        >
            <StreetMapCapture onCapture={setMapBackgroundImage} />
        </div>
    ) : null;

    if (!mapReady) {
        return (
            <>
                <div style={{ padding: 20, fontFamily: 'monospace', color: '#666' }}>
                    Preparing high-resolution map...
                </div>
                {hiddenMapCapture}
            </>
        );
    }

    return (
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
            {hiddenMapCapture}
            <VectorStarMap />
        </div>
    );
};

export default PosterRenderPage;
