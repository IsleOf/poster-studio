import { describe, expect, it } from 'vitest';
import { calculateMapExportTarget } from './mapExportSizing';

describe('calculateMapExportTarget', () => {
    it('keeps small print sizes at the baseline capture size', () => {
        const target = calculateMapExportTarget({
            printSize: { label: 'A5', width: 5.83, height: 8.27, ratio: '210/297' },
            dpi: 300,
            maskShape: 'rect',
            circleSize: 1,
            heartSize: 1,
            houseSize: 1,
        });

        expect(target.targetPx).toBe(3600);
        expect(target.rawTargetPx).toBeLessThan(3600);
        expect(target.detailScale).toBe(1);
    });

    it('requests a larger map capture for large print sizes', () => {
        const target = calculateMapExportTarget({
            printSize: { label: '24x36"', width: 24, height: 36, ratio: '2/3' },
            dpi: 300,
            maskShape: 'rect',
            circleSize: 1,
            heartSize: 1,
            houseSize: 1,
        });

        expect(target.rawTargetPx).toBe(9450);
        expect(target.targetPx).toBe(9450);
        expect(target.detailScale).toBeGreaterThan(2);
    });
});
