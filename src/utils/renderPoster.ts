// Renders the poster SVG to a PNG blob (or PDF) at the specified DPI.
// Used by DownloadButton (with watermark) and saveDesign (without watermark).

import { FONT_REGISTRY } from './fontRegistry';

// Cache base64-encoded font data URIs so we only fetch each file once per session.
const fontDataUriCache = new Map<string, string>();

async function fetchFontAsDataUri(url: string): Promise<string | null> {
    if (fontDataUriCache.has(url)) return fontDataUriCache.get(url)!;
    try {
        // url is already a Vite-resolved absolute path like /assets/Title001-xxx.woff2
        const fullUrl = url.startsWith('http') ? url : new URL(url, location.origin).href;
        const resp = await fetch(fullUrl);
        if (!resp.ok) return null;
        const buf = await resp.arrayBuffer();
        const bytes = new Uint8Array(buf);
        // Encode in chunks to avoid call-stack overflow on large buffers
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        const dataUri = `data:font/woff2;base64,${btoa(binary)}`;
        fontDataUriCache.set(url, dataUri);
        return dataUri;
    } catch {
        return null;
    }
}

// Cache base64-encoded image data URIs (background art, in-shape captures) per session.
const imageDataUriCache = new Map<string, string>();

function guessImageMime(url: string): string {
    const u = url.split('?')[0].toLowerCase();
    if (u.endsWith('.webp')) return 'image/webp';
    if (u.endsWith('.avif')) return 'image/avif';
    if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
    if (u.endsWith('.svg')) return 'image/svg+xml';
    return 'image/png';
}

// SSRF guard: this fetch runs inside the server-side render browser too, so an attacker-controlled
// backgroundImageUrl could otherwise make it fetch internal/metadata URLs. Default-deny: allow only
// same-origin (relative asset paths) and an explicit host allowlist. Blocks private IPs / metadata by
// omission. Definitive fix is still network-isolating the render browser at the infra layer.
const ALLOWED_IMAGE_HOSTS = new Set<string>(['themappedmoment.com', 'www.themappedmoment.com']);
export function isAllowedImageUrl(fullUrl: string): boolean {
    let u: URL;
    try { u = new URL(fullUrl); } catch { return false; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (typeof location !== 'undefined' && u.origin === location.origin) return true;
    return ALLOWED_IMAGE_HOSTS.has(u.hostname.toLowerCase());
}

async function fetchImageAsDataUri(url: string): Promise<string | null> {
    if (imageDataUriCache.has(url)) return imageDataUriCache.get(url)!;
    try {
        const fullUrl = url.startsWith('http') ? url : new URL(url, location.origin).href;
        if (!isAllowedImageUrl(fullUrl)) {
            console.warn('[renderPoster] Blocked non-allowlisted image URL:', fullUrl);
            return null;
        }
        const resp = await fetch(fullUrl);
        if (!resp.ok) return null;
        const buf = await resp.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        const mime = resp.headers.get('content-type') || guessImageMime(url);
        const dataUri = `data:${mime};base64,${btoa(binary)}`;
        imageDataUriCache.set(url, dataUri);
        return dataUri;
    } catch {
        return null;
    }
}

// Inline every <image> whose href points at an external/relative URL as a base64 data URI.
// A serialized SVG drawn through a blob URL cannot resolve relative hrefs (e.g. the SM002 forest
// background "/backgrounds/sm002/bg-teal-2000.webp"), so without this the image silently drops
// from the exported PNG/PDF and the preview — even though the live DOM preview shows it fine.
const XLINK = 'http://www.w3.org/1999/xlink';
async function embedImages(svgEl: SVGSVGElement): Promise<void> {
    const images = Array.from(svgEl.querySelectorAll('image'));
    for (const img of images) {
        const href = img.getAttribute('href') || img.getAttributeNS(XLINK, 'href');
        if (!href || href.startsWith('data:')) continue;
        const dataUri = await fetchImageAsDataUri(href);
        if (dataUri) {
            img.setAttribute('href', dataUri);
            try { img.removeAttributeNS(XLINK, 'href'); } catch { /* no xlink attr */ }
        }
    }
}

// Collect every font-family name set as an attribute in the SVG element tree.
// font-family attributes may be comma-separated stacks like "Title001, serif" —
// split and strip quotes so each family name can be looked up individually.
function collectUsedFontFamilies(svgEl: SVGSVGElement): Set<string> {
    const families = new Set<string>();
    svgEl.querySelectorAll<Element>('[font-family]').forEach(el => {
        const ff = el.getAttribute('font-family');
        if (!ff) return;
        for (const part of ff.split(',')) {
            const name = part.trim().replace(/^['"]|['"]$/g, '');
            if (name) families.add(name);
        }
    });
    return families;
}

// Build an inline <style> block with base64-embedded @font-face declarations
// for all font families found in the SVG. Uses the FONT_REGISTRY which maps
// family names → Vite-resolved woff2 URLs (guaranteed to work even in blob context).
async function buildInlineFontStyle(usedFamilies: Set<string>): Promise<string> {
    const rules: string[] = [];
    for (const family of usedFamilies) {
        const variants = FONT_REGISTRY[family];
        if (!variants) continue; // not a custom font — system font, no embedding needed
        for (const { weight, url, sizeAdjust } of variants) {
            const dataUri = await fetchFontAsDataUri(url);
            if (!dataUri) continue;
            const sizeAdjustRule = sizeAdjust ? `size-adjust:${sizeAdjust};` : '';
            rules.push(
                `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;${sizeAdjustRule}src:url('${dataUri}') format('woff2');}`
            );
        }
    }
    return rules.join('\n');
}

export async function renderPosterToBlob(
    svgEl: SVGSVGElement,
    widthInches: number,
    heightInches: number,
    dpi: number,
    watermark: boolean
): Promise<Blob> {
    const outputWidth = Math.round(widthInches * dpi);
    const outputHeight = Math.round(heightInches * dpi);

    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('width', String(outputWidth));
    svgClone.setAttribute('height', String(outputHeight));

    // Embed external <image> hrefs (background art, captures) as base64 so they survive the
    // blob/canvas rasterization — relative URLs don't resolve in a serialized SVG.
    await embedImages(svgClone);

    // Embed custom fonts as base64 data URIs so they render correctly in blob context.
    const usedFamilies = collectUsedFontFamilies(svgClone);
    const fontStyle = await buildInlineFontStyle(usedFamilies);
    if (fontStyle) {
        const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = fontStyle;
        svgClone.insertBefore(styleEl, svgClone.firstChild);
    }

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = outputWidth;
            canvas.height = outputHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, outputWidth, outputHeight);
            if (watermark) drawDemoWatermark(ctx, outputWidth, outputHeight);
            URL.revokeObjectURL(svgUrl);
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('canvas.toBlob returned null'));
            }, 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(svgUrl); reject(new Error('SVG load failed')); };
        img.src = svgUrl;
    });
}

/**
 * Render the poster SVG to a print-ready PDF.
 * The PDF is sized exactly to the poster dimensions in inches (72 pt/inch),
 * with the 300 DPI raster image embedded — suitable for Prodigi, Gelato, and
 * most digital print services.
 */
export async function renderPosterToPdf(
    svgEl: SVGSVGElement,
    widthInches: number,
    heightInches: number,
    title: string
): Promise<Blob> {
    // Render at 300 DPI then embed in PDF
    const pngBlob = await renderPosterToBlob(svgEl, widthInches, heightInches, 300, false);

    // Lazy-import jspdf to keep it out of the initial bundle
    const { jsPDF } = await import('jspdf');

    // PDF page size in mm (jsPDF default unit)
    const mmPerInch = 25.4;
    const widthMm = widthInches * mmPerInch;
    const heightMm = heightInches * mmPerInch;

    const doc = new jsPDF({
        orientation: widthInches > heightInches ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMm, heightMm],
        compress: true,
    });

    // Convert blob to data URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(pngBlob);
    });

    doc.addImage(dataUrl, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');

    return doc.output('blob');
}

/**
 * Demo watermark for the free preview download.
 *
 * DESIGN GOALS, in priority order:
 *   1. The buyer can still evaluate their design (too destructive kills conversion).
 *   2. The file is unusable as a finished print.
 *   3. It cannot be stripped by a single uniform image operation.
 *
 * The previous version failed (3): one flat colour at a CONSTANT alpha (0.28), a single
 * rotation, and only 6 sparse marks. A constant-alpha overlay of a known colour is a linear
 * operation, so a levels/curves tweak substantially reverses it — and with big clean regions
 * left over, the rest is a few clone-stamps. Countermeasures used here:
 *
 *   - DENSE TILING over the whole canvas, so no clean region survives to sample/heal from.
 *   - PIXEL-DEPENDENT BLENDING ('overlay'), whose result depends on the underlying pixel.
 *     There is no constant to subtract, so a global levels/opacity correction cannot invert it.
 *   - ALTERNATING LIGHT AND DARK marks, so neither a white-key nor a black-key removes them all.
 *   - PER-MARK JITTER of alpha and angle (deterministic PRNG, so renders stay reproducible),
 *     defeating frequency/pattern-based removal that assumes a uniform repeating tile.
 *   - CENTRE BANNERS over the focal art, so cropping the edges doesn't yield a usable poster.
 *   - HAIRLINE DIAGONALS across everything — cheap to draw, visually obvious in print, and
 *     tedious to reconstruct over detailed map linework.
 *
 * This raises removal cost from "one slider" to "manual repainting of the entire canvas",
 * at which point buying the $6.99 file is plainly the cheaper option — which is the goal.
 */
function drawDemoWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();

    const text = 'themappedmoment.com';
    const shortSide = Math.min(w, h);

    // Deterministic PRNG (LCG) — jitter must be stable across re-renders of the same size,
    // otherwise the same design would produce visibly different files each export.
    let seed = 0x2f6e2b1;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };

    // ── 1. Dense tiled marks ────────────────────────────────────────────────
    // Blend-mode choice matters more than it looks. 'overlay' ALONE is a trap: overlay(1,s)=1
    // and overlay(0,s)=0, so it is a no-op on pure white and pure black. Our posters are often
    // white-background (street maps) or have wide white margins, so an overlay-only watermark
    // leaves the most valuable areas effectively unmarked (verified: white margins came out
    // clean). So each mark picks one of three modes:
    //   source-over — plain alpha in mid-grey: ALWAYS bites, whatever the backdrop.
    //   multiply    — darkens; bites hardest on light/white areas.
    //   screen      — lightens; bites hardest on dark/navy areas.
    // The mix guarantees coverage across the whole tonal range, and because two of the three
    // are pixel-dependent there is still no single constant to subtract.
    const fontSize = Math.round(shortSide * 0.040);
    ctx.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stepX = shortSide * 0.46;
    const stepY = shortSide * 0.16;
    let row = 0;
    for (let y = -h * 0.15; y < h * 1.15; y += stepY) {
        const rowOffset = (row % 2) * (stepX / 2); // brick offset — breaks vertical alignment
        let col = 0;
        for (let x = -w * 0.15; x < w * 1.15; x += stepX) {
            const mode = (row + col) % 3;
            ctx.save();
            ctx.translate(x + rowOffset, y);
            ctx.rotate(-Math.PI / 6 + (rnd() - 0.5) * 0.14); // angle jitter
            if (mode === 0) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 0.30 + rnd() * 0.14;
                ctx.fillStyle = '#7a7f88';                    // mid-grey: visible on light AND dark
            } else if (mode === 1) {
                ctx.globalCompositeOperation = 'multiply';
                ctx.globalAlpha = 0.42 + rnd() * 0.22;
                ctx.fillStyle = '#3d4450';
            } else {
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.42 + rnd() * 0.22;
                ctx.fillStyle = '#c9ced8';
            }
            ctx.fillText(text, 0, 0);
            ctx.restore();
            col++;
        }
        row++;
    }

    // ── 2. Centre banners over the focal artwork (defeats edge-cropping) ────
    // Plain alpha (source-over) so they bite regardless of backdrop, in mid-grey with a
    // light drop copy for legibility on both dark and light art.
    const bannerSize = Math.round(shortSide * 0.075);
    ctx.font = `800 ${bannerSize}px Arial, Helvetica, sans-serif`;
    for (const yRatio of [0.30, 0.50, 0.70]) {
        ctx.save();
        ctx.translate(w / 2, h * yRatio);
        ctx.rotate(-Math.PI / 6);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.30;
        ctx.fillStyle = '#e8ebf0';
        ctx.fillText('PREVIEW — themappedmoment.com', bannerSize * 0.035, bannerSize * 0.035);
        ctx.globalAlpha = 0.44;
        ctx.fillStyle = '#5b6270';
        ctx.fillText('PREVIEW — themappedmoment.com', 0, 0);
        ctx.restore();
    }

    // ── 3. Hairline diagonals across the entire canvas ─────────────────────
    // Mid-grey at plain alpha — again so white margins are not left untouched.
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = Math.max(1, Math.round(shortSide * 0.0016));
    const lineStep = shortSide * 0.055;
    for (let i = -h; i < w + h; i += lineStep) {
        ctx.globalAlpha = 0.10 + rnd() * 0.08;
        ctx.strokeStyle = (Math.round(i / lineStep) % 2 === 0) ? '#8f959f' : '#5b6270';
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.stroke();
    }

    ctx.restore();
}
