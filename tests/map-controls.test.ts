/**
 * Map-controls integration tests:
 *   - #5 pasting coordinates / a map URL into the location search resolves to a point
 *   - #4 the colored-map "Label size" slider appears only for colored maps
 */
import { test, expect, Page } from '@playwright/test';
import { setupMockApi } from './fixtures/mockApi';

async function openMode(page: Page, mode: 'streetmap' | 'coloredmap') {
    await setupMockApi(page);
    await page.goto('/');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: mode === 'streetmap' ? /STREET MAP/i : /COLORED MAP/i }).click();
    await page.waitForTimeout(500);
}

test.describe('Location search — coordinate paste (#5)', () => {
    test('typing a decimal coordinate pair yields a pin result', async ({ page }) => {
        await openMode(page, 'streetmap');
        const search = page.getByPlaceholder(/search location/i).first();
        await search.fill('48.8566, 2.3522');
        // A result row labelled with the coordinates (📍) should appear, no geocoder needed.
        await expect(page.getByText(/48\.85.*2\.35/).first()).toBeVisible({ timeout: 5000 });
    });

    test('selecting a pasted coordinate sets the Lng field', async ({ page }) => {
        await openMode(page, 'streetmap');
        const search = page.getByPlaceholder(/search location/i).first();
        await search.fill('40.7128, -74.0060');
        const result = page.getByText(/40\.71.*-74\.00/).first();
        await expect(result).toBeVisible({ timeout: 5000 });
        await result.click();
        await page.waitForTimeout(400);
        // The Lng input (a number input) should now reflect New York (~ -74).
        const lng = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
            const v = inputs.find(i => /^-7[0-9]\./.test(i.value));
            return v ? parseFloat(v.value) : null;
        });
        expect(lng).not.toBeNull();
        expect(lng!).toBeLessThan(-70);
    });

    test('pasting a Google Maps URL yields a pin result', async ({ page }) => {
        await openMode(page, 'streetmap');
        const search = page.getByPlaceholder(/search location/i).first();
        await search.fill('https://www.google.com/maps/@51.5074,-0.1278,15z');
        await expect(page.getByText(/51\.50.*-0\.12/).first()).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Colored-map label size (#4)', () => {
    test('label-size slider is present in colored map mode', async ({ page }) => {
        await openMode(page, 'coloredmap');
        await expect(page.getByText(/Label size:/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('label-size slider is absent in 2-colour street map mode', async ({ page }) => {
        await openMode(page, 'streetmap');
        await expect(page.getByText(/Label size:/i)).toHaveCount(0);
    });
});
