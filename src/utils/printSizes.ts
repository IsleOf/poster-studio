// Canonical print-size objects keyed by their short label ("5x7", "A4", …).
// The store keeps printSize as an OBJECT { label, width, height, ratio }, but templates and
// recovered/Etsy designs store only the short string label. Any code that hydrates a saved
// design state into the store MUST normalise that string back into the object — otherwise
// `printSize.ratio.split('/')` (in VectorStarMap) throws "Cannot read properties of undefined".
export type PrintSize = { label: string; width: number; height: number; ratio: string };

export const PRINT_SIZE_BY_LABEL: Record<string, PrintSize> = {
    '5x7':   { label: '5x7"',   width: 5,   height: 7,   ratio: '5/7'     },
    '8x10':  { label: '8x10"',  width: 8,   height: 10,  ratio: '4/5'     },
    '11x14': { label: '11x14"', width: 11,  height: 14,  ratio: '11/14'   },
    '12x16': { label: '12x16"', width: 12,  height: 16,  ratio: '3/4'     },
    '16x20': { label: '16x20"', width: 16,  height: 20,  ratio: '4/5'     },
    '18x24': { label: '18x24"', width: 18,  height: 24,  ratio: '3/4'     },
    '24x36': { label: '24x36"', width: 24,  height: 36,  ratio: '2/3'     },
    'A5':    { label: 'A5',     width: 148, height: 210, ratio: '148/210' },
    'A4':    { label: 'A4',     width: 210, height: 297, ratio: '210/297' },
    'A3':    { label: 'A3',     width: 297, height: 420, ratio: '297/420' },
    'A2':    { label: 'A2',     width: 420, height: 594, ratio: '420/594' },
    'A1':    { label: 'A1',     width: 594, height: 841, ratio: '594/841' },
};

// Return a valid PrintSize object for `value`, or null if it can't be resolved.
// - object with a `.ratio` → returned as-is (already normalised)
// - string label ("5x7", `5x7"`, "5X7") → looked up (case-insensitive, trailing-quote stripped)
export function normalizePrintSize(value: unknown): PrintSize | null {
    if (value && typeof value === 'object' && typeof (value as PrintSize).ratio === 'string') {
        return value as PrintSize;
    }
    if (typeof value === 'string') {
        const key = value.replace(/["”]/g, '').trim();
        return PRINT_SIZE_BY_LABEL[key] ?? PRINT_SIZE_BY_LABEL[key.toLowerCase()] ?? null;
    }
    return null;
}

// A-series labels store width/height in millimetres (see table above); every other size
// stores inches directly. renderPosterToBlob/Pdf and the on-screen pixel-dimension labels
// all require inches — call this instead of reading size.width/height directly, or an A4
// export computes a ~63000×89100px canvas (210×300, 297×300) and canvas.toBlob() silently
// returns null (found via the listing-factory pipeline, 2026-08-14 — no prior A-series order
// had ever exercised this path in production, so it was live-broken but unnoticed).
const MM_LABELS = new Set(['A5', 'A4', 'A3', 'A2', 'A1']);
const MM_PER_INCH = 25.4;
export function printSizeInches(size: PrintSize): { width: number; height: number } {
    if (MM_LABELS.has(size.label)) {
        return { width: size.width / MM_PER_INCH, height: size.height / MM_PER_INCH };
    }
    return { width: size.width, height: size.height };
}
