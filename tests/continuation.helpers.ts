import fs from 'fs';
import path from 'path';
import { expect, Page } from '@playwright/test';
import { setupMockApi } from './fixtures/mockApi';

const SCREENSHOT_DIR = path.join(process.cwd(), 'tests', 'screenshots', 'continuation');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

export const CONTINUATION_LISTING = {
    id: 1,
    slug: 'star-map-night-we-met',
    name: 'Custom Star Map Poster — The Night We Met',
    description: 'Personalised star map poster in multiple sizes.',
    templates: [
        {
            id: 'sm001-design001-8x10',
            name: 'The Night We Met — 8x10"',
            thumbnail_path: '/designs/SM001/Design001/8x10.png',
            fulfillment_size: '8x10',
            sell_price_cents: 1999,
            design_group_id: 'sm001-design001',
        },
        {
            id: 'sm001-design001-11x14',
            name: 'The Night We Met — 11x14"',
            thumbnail_path: '/designs/SM001/Design001/8x10.png',
            fulfillment_size: '11x14',
            sell_price_cents: 2499,
            design_group_id: 'sm001-design001',
        },
        {
            id: 'sm001-design002-8x10',
            name: 'Our Stars Aligned — 8x10"',
            thumbnail_path: '/designs/SM001/Design002/8x10.png',
            fulfillment_size: '8x10',
            sell_price_cents: 1999,
            design_group_id: 'sm001-design002',
        },
    ],
};

export async function setupContinuationMocks(page: Page, options: { loggedIn?: boolean } = {}) {
    await setupMockApi(page, options);

    await page.route('**/api/listings/star-map-night-we-met', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(CONTINUATION_LISTING),
        })
    );

    await page.route('**/api/templates/sm001-design001-8x10', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'sm001-design001-8x10',
                settings: {
                    posterType: 'starmap',
                    maskShape: 'circle',
                    posterColor: '#0a1628',
                    textColor: '#ffffff',
                    title: 'The Night We Met',
                    location: 'New York, NY',
                    lat: 40.7128,
                    lng: -74.006,
                    printSize: '8x10',
                },
            }),
        })
    );

    await page.route('**/api/templates/sm001-design002-8x10', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'sm001-design002-8x10',
                settings: {
                    posterType: 'starmap',
                    maskShape: 'heart',
                    posterColor: '#ffffff',
                    textColor: '#1a202c',
                    title: 'Our Stars Aligned',
                    titleAllCaps: true,
                    location: 'Austin, TX',
                    lat: 30.2672,
                    lng: -97.7431,
                    printSize: '8x10',
                },
            }),
        })
    );
}

export async function waitForDesignerReady(page: Page) {
    await page.waitForSelector('#poster-preview svg', { timeout: 15000 });
    await Promise.race([
        page.waitForFunction(
            () => document.querySelectorAll('#poster-preview svg circle').length > 50,
            { timeout: 15000 }
        ),
        page.waitForTimeout(5000),
    ]).catch(() => {});
    await expect(page.locator('#poster-preview')).toHaveCSS('opacity', '1');
    await expect(page.getByText('Loading design...')).toBeHidden();
    await page.waitForTimeout(250);
}

export async function gotoDesigner(page: Page, route = '/') {
    await setupContinuationMocks(page);
    await page.goto(route);
    await waitForDesignerReady(page);
}

export async function gotoAdmin(page: Page, route: string) {
    await setupContinuationMocks(page, { loggedIn: true });
    await page.goto(route);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(250);
}

export async function fullShot(page: Page, name: string) {
    await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${name}.png`),
        fullPage: false,
    });
}

export async function posterShot(page: Page, name: string) {
    const poster = page.locator('#poster-preview');
    await poster.screenshot({
        path: path.join(SCREENSHOT_DIR, `${name}.png`),
    });
}
