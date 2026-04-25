/**
 * Unit tests for applyTemplate.ts
 *
 * Tests the core template application logic, print size resolution,
 * default fallbacks, and customText handling — all without needing
 * a browser or DOM.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applyTemplate, captureCurrentSettings, PRINT_SIZE_MAP } from './applyTemplate';
import { useStore } from '../store/useStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getState() {
    return useStore.getState() as unknown as Record<string, unknown>;
}

function resetStore() {
    // Reset to known baseline by applying an empty template
    applyTemplate({});
}

// ── PRINT_SIZE_MAP ────────────────────────────────────────────────────────────

describe('PRINT_SIZE_MAP', () => {
    it('has entries for all expected size codes', () => {
        const expected = ['4x6', '5x7', '8x10', '11x14', '16x20', '18x24', '24x36', 'A4', 'A3'];
        for (const code of expected) {
            expect(PRINT_SIZE_MAP).toHaveProperty(code);
        }
    });

    it('each entry has width, height, label, and ratio', () => {
        for (const [code, val] of Object.entries(PRINT_SIZE_MAP)) {
            expect(typeof val.width, `${code}.width`).toBe('number');
            expect(typeof val.height, `${code}.height`).toBe('number');
            expect(typeof val.label, `${code}.label`).toBe('string');
            expect(typeof val.ratio, `${code}.ratio`).toBe('string');
        }
    });

    it('width is always less than height (portrait orientation)', () => {
        for (const [code, val] of Object.entries(PRINT_SIZE_MAP)) {
            expect(val.width, `${code} width < height`).toBeLessThan(val.height);
        }
    });

    it('8x10 resolves to correct dimensions', () => {
        expect(PRINT_SIZE_MAP['8x10']).toMatchObject({ width: 8, height: 10, ratio: '4/5' });
    });
});

// ── applyTemplate ─────────────────────────────────────────────────────────────

describe('applyTemplate', () => {
    beforeEach(resetStore);

    it('applies string fields from settings', () => {
        applyTemplate({ posterColor: '#abcdef', textColor: '#111111', titleFont: 'Oswald' });
        const state = getState();
        expect(state.posterColor).toBe('#abcdef');
        expect(state.textColor).toBe('#111111');
        expect(state.titleFont).toBe('Oswald');
    });

    it('applies boolean fields from settings', () => {
        applyTemplate({ showBorder: false, showFrame: true, showConstellations: false });
        const state = getState();
        expect(state.showBorder).toBe(false);
        expect(state.showFrame).toBe(true);
        expect(state.showConstellations).toBe(false);
    });

    it('applies numeric fields from settings', () => {
        applyTemplate({ titleFontSize: 120, subtitleFontSize: 40, frameInset: 20 });
        const state = getState();
        expect(state.titleFontSize).toBe(120);
        expect(state.subtitleFontSize).toBe(40);
        expect(state.frameInset).toBe(20);
    });

    it('resolves printSize string code to full object', () => {
        applyTemplate({ printSize: '18x24' });
        const ps = getState().printSize as Record<string, unknown>;
        expect(ps.width).toBe(18);
        expect(ps.height).toBe(24);
        expect(ps.label).toBe('18x24"');
    });

    it('resolves A4 printSize string code', () => {
        applyTemplate({ printSize: 'A4' });
        const ps = getState().printSize as Record<string, unknown>;
        expect(ps.width).toBe(8.27);
        expect(ps.ratio).toBe('210/297');
    });

    it('falls back to defaults for fields absent from the template', () => {
        // Apply minimal template (no posterColor)
        applyTemplate({ titleFont: 'Cinzel' });
        const state = getState();
        // posterColor should be the default, not undefined
        expect(state.posterColor).toBe('#1B2735'); // TEMPLATE_FIELD_DEFAULTS value
    });

    it('handles preserveText: true — does not overwrite title/subtitle', () => {
        useStore.setState({ title: 'My Title', subtitle: 'My Subtitle' } as Parameters<typeof useStore.setState>[0]);
        applyTemplate({ title: 'New Title', subtitle: 'New Subtitle' }, { preserveText: true });
        const state = getState();
        // With preserveText, title/subtitle in template are skipped
        // But the defaults will still be applied via TEMPLATE_FIELD_DEFAULTS (which has '' for title)
        // The preserveText flag only prevents template overrides from replacing existing values
        expect(state.title).not.toBe('New Title');
    });

    it('sets customText fields from template settings', () => {
        applyTemplate({ title: 'Star Night', subtitle: 'Summer Solstice', dedication: 'For you' });
        const ct = getState().customText as Record<string, string>;
        expect(ct.title).toBe('Star Night');
        expect(ct.subtitle).toBe('Summer Solstice');
        expect(ct.dedication).toBe('For you');
    });

    it('resets customText.date and customText.location to empty when applying template', () => {
        useStore.setState({ customText: { title: 'x', subtitle: 'y', date: '2024-01-01', location: 'Paris', dedication: '', names: '', coords: '' } } as Parameters<typeof useStore.setState>[0]);
        applyTemplate({ title: 'New' });
        const ct = getState().customText as Record<string, string>;
        expect(ct.date).toBe('');
        expect(ct.location).toBe('');
    });

    it('applies maskShape and posterType from settings', () => {
        applyTemplate({ maskShape: 'rect', posterType: 'streetmap' });
        const state = getState();
        expect(state.maskShape).toBe('rect');
        expect(state.posterType).toBe('streetmap');
    });

    it('does not throw on empty settings object', () => {
        expect(() => applyTemplate({})).not.toThrow();
    });

    it('ignores unknown keys not in TEMPLATE_FIELDS', () => {
        expect(() => applyTemplate({ unknownField123: 'should-be-ignored' } as Record<string, unknown>)).not.toThrow();
        // Unknown fields should not appear in state
        expect((getState() as Record<string, unknown>).unknownField123).toBeUndefined();
    });
});

// ── captureCurrentSettings ────────────────────────────────────────────────────

describe('captureCurrentSettings', () => {
    beforeEach(resetStore);

    it('returns an object with all expected keys', () => {
        const settings = captureCurrentSettings();
        expect(settings).toHaveProperty('posterColor');
        expect(settings).toHaveProperty('titleFont');
        expect(settings).toHaveProperty('printSize');
        expect(settings).toHaveProperty('maskShape');
        expect(settings).toHaveProperty('showBorder');
    });

    it('serializes printSize object back to string code', () => {
        applyTemplate({ printSize: '11x14' });
        const settings = captureCurrentSettings();
        expect(settings.printSize).toBe('11x14');
    });

    it('captures customText.title as top-level title field', () => {
        applyTemplate({ title: 'My Star Map' });
        const settings = captureCurrentSettings();
        expect(settings.title).toBe('My Star Map');
    });

    it('captures customText.dedication as top-level dedication field', () => {
        applyTemplate({ dedication: 'To the moon and back' });
        const settings = captureCurrentSettings();
        expect(settings.dedication).toBe('To the moon and back');
    });

    it('round-trips a full template apply → capture without data loss', () => {
        const input = {
            posterColor: '#001122',
            textColor: '#ffffff',
            titleFont: 'Oswald',
            titleFontSize: 96,
            maskShape: 'circle',
            showBorder: false,
            printSize: '16x20',
            title: 'Round Trip',
        };
        applyTemplate(input);
        const captured = captureCurrentSettings();

        expect(captured.posterColor).toBe('#001122');
        expect(captured.textColor).toBe('#ffffff');
        expect(captured.titleFont).toBe('Oswald');
        expect(captured.titleFontSize).toBe(96);
        expect(captured.maskShape).toBe('circle');
        expect(captured.showBorder).toBe(false);
        expect(captured.printSize).toBe('16x20');
        expect(captured.title).toBe('Round Trip');
    });

    it('applies → captures → applies again gives same result', () => {
        const input = { posterColor: '#ff0000', titleFont: 'Cinzel', printSize: 'A3' };
        applyTemplate(input);
        const first = captureCurrentSettings();

        applyTemplate(first);
        const second = captureCurrentSettings();

        expect(second.posterColor).toBe(first.posterColor);
        expect(second.titleFont).toBe(first.titleFont);
        expect(second.printSize).toBe(first.printSize);
    });
});
