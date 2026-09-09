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
import { isVectorStreetMapEnabled } from '../utils/vectorStreetMapRenderer';
import { normalizePrintSize, printSizeInches } from '../utils/printSizes';

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
        // printSize may be a string label (templates/recovered designs) — the renderer needs
        // the object {…,ratio}. Normalise; skip if unresolvable (store default object stays).
        if (key === 'printSize' && typeof value === 'string') {
            const sz = normalizePrintSize(value);
            if (sz) patch[key] = sz;
            continue;
        }
        patch[key] = value;
    }

    useStore.setState(patch as Partial<ReturnType<typeof useStore.getState>>);
}

// Wait until the star map has painted at least MIN_STARS circles into the SVG.
// Replaces the fixed 3500ms timer — prevents blank renders when the GitHub CDN is slow.
async function waitForStarMap(svgEl: SVGSVGElement, minStars = 50, timeoutMs = 20000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const circles = svgEl.querySelectorAll('#map-layer circle');
        if (circles.length >= minStars) {
            // One extra rAF so D3 finishes any in-progress paint
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    // Timeout is non-fatal — render whatever is there rather than failing the order
    console.warn(`[PosterRenderPage] Star wait timed out after ${timeoutMs}ms (${svgEl.querySelectorAll('#map-layer circle').length} circles found)`);
}

async function waitForVectorStreetMap(svgEl: SVGSVGElement): Promise<void> {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
        const mapLayer = svgEl.querySelector('#map-layer');
        const pathChars = Array.from(mapLayer?.querySelectorAll('path') ?? [])
            .reduce((total, path) => total + (path.getAttribute('d')?.length || 0), 0);
        const text = mapLayer?.textContent || '';

        if (pathChars > 10000 && !text.includes('Search a city to load map')) {
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timed out waiting for vector street map paths');
}

const PosterRenderPage: React.FC = () => {
    const [ready, setReady] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const renderStartedRef = React.useRef(false);
    const {
        printSize, posterType, captureHighResFn, setMapBackgroundImage,
        maskShape, circleSize, heartSize, houseSize,
        mapColorPreset,
    } = useStore();
    const useVectorStreetMap = posterType === 'streetmap'
        && mapColorPreset === 'design2'
        && isVectorStreetMapEnabled();

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
                // Migrate designs saved before the mapInteriorColor sync fix:
                // if mapInteriorColor is still the old default but posterColor differs,
                // sync them so the server render matches the live browser preview.
                if (state.posterColor && state.mapInteriorColor === '#1B2735'
                    && state.mapInteriorColor !== state.posterColor) {
                    useStore.setState({ mapInteriorColor: state.posterColor });
                }
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
        if (posterType === 'starmap' || useVectorStreetMap) {
            // Keep a designed in-shape background (asset URL); only clear transient street captures.
            const bg = useStore.getState().mapBackgroundImage;
            if (!bg || bg.startsWith('data:') || bg.startsWith('blob:')) setMapBackgroundImage(null);
            setMapReady(true);
            return;
        }
        setMapReady(false);
    }, [ready, posterType, useVectorStreetMap, setMapBackgroundImage]);

    useEffect(() => {
        if (!ready || posterType === 'starmap' || useVectorStreetMap || !captureHighResFn) return;

        let cancelled = false;
        const prepareMap = async () => {
            try {
                const target = calculateMapExportTarget({
                    printSize: { ...printSize, ...printSizeInches(printSize) },
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
    }, [ready, posterType, useVectorStreetMap, captureHighResFn, printSize, maskShape, circleSize, heartSize, houseSize, setMapBackgroundImage]);

    // Once the SVG and high-resolution map image are ready, export it to PNG and signal completion
    useEffect(() => {
        if (!ready || !mapReady || renderStartedRef.current) return;

        // Give the SVG rendering a moment to settle (star data fetch + D3 paint)
        const timer = setTimeout(async () => {
            if (renderStartedRef.current) return;
            renderStartedRef.current = true;
            try {
                const svgEl = document.querySelector('#poster-render svg') as SVGSVGElement | null;
                if (!svgEl) throw new Error('SVG element not found');

                if (posterType === 'starmap') {
                    // Wait for star circles to actually paint — avoids blank renders
                    // when the GitHub CDN is slow to deliver the star JSON
                    await waitForStarMap(svgEl);
                } else if (useVectorStreetMap) {
                    await waitForVectorStreetMap(svgEl);
                }

                const { width: wIn, height: hIn } = printSizeInches(printSize);
                const blob = await renderPosterToBlob(
                    svgEl,
                    wIn,
                    hIn,
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
        }, posterType === 'starmap' ? 500 : 500); // initial settle; star wait now uses DOM polling

        return () => clearTimeout(timer);
    }, [ready, mapReady, printSize, posterType, useVectorStreetMap]);

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

    const hiddenMapCapture = posterType !== 'starmap' && !useVectorStreetMap ? (
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
            <VectorStarMap forceVector={true} />
        </div>
    );
};

export default PosterRenderPage;
