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
        for (const { weight, url } of variants) {
            const dataUri = await fetchFontAsDataUri(url);
            if (!dataUri) continue;
            rules.push(
                `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;src:url('${dataUri}') format('woff2');}`
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

function drawDemoWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    // Two passes: dark shadow for light-mode posters, bright text on top.
    // This ensures the watermark is legible on both dark and light backgrounds.
    const fontSize = Math.round(w * 0.09);
    const step = w * 0.38;
    const lines = ['SAMPLE', 'themappedmoment.com'];

    for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = pass === 0 ? 0.22 : 0.30;
        ctx.fillStyle = pass === 0 ? '#000000' : '#ffffff';
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let y = -h; y < h * 2; y += step) {
            for (let x = -w; x < w * 2; x += step) {
                ctx.save();
                ctx.translate(x + (pass === 0 ? 2 : 0), y + (pass === 0 ? 2 : 0));
                ctx.rotate(-Math.PI / 6);
                lines.forEach((line, i) => {
                    ctx.fillText(line, 0, i * (fontSize * 1.3));
                });
                ctx.restore();
            }
        }
    }
    ctx.restore();
}
