// Renders the poster SVG to a PNG blob at the specified DPI.
// Used by DownloadButton (with watermark) and saveDesign (without watermark).
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

function drawDemoWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(w * 0.12)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const step = w * 0.4;
    for (let y = -h; y < h * 2; y += step) {
        for (let x = -w; x < w * 2; x += step) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-Math.PI / 5);
            ctx.fillText('DEMO', 0, 0);
            ctx.restore();
        }
    }
    ctx.restore();
}
