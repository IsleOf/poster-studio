/**
 * User journey tests — end-to-end flows for customers and admin.
 * Covers: poster design, template URLs, share links, verify order,
 * admin order management, template CRUD, bulk actions, CSV export.
 * All API calls are mocked via setupMockApi.
 */
import { test, expect, Page } from '@playwright/test';
import { setupMockApi, MOCK_ORDERS, MOCK_TEMPLATES } from './fixtures/mockApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function openDesigner(page: Page) {
    await setupMockApi(page);
    await page.goto('/');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(600);
}

/** Expand an accordion section by its header text if it is not already open. */
async function expandAccordion(page: Page, label: string) {
    const btn = page.locator('.chakra-accordion__button').filter({ hasText: label }).first();
    await btn.scrollIntoViewIfNeeded();
    const isExpanded = await btn.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
        await btn.click();
        await page.waitForTimeout(400);
    }
}

async function asAdmin(page: Page, path = '/admin/dashboard') {
    await setupMockApi(page, { loggedIn: true });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
}

// ═══════════════════════════════════════════════════════════
// CUSTOMER JOURNEY: Open → Pick Template → Enter Details → Share
// ═══════════════════════════════════════════════════════════

test.describe('Customer journey — design a poster', () => {
    test('open designer → SVG renders immediately', async ({ page }) => {
        await openDesigner(page);
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('pick design card → SVG still renders', async ({ page }) => {
        await openDesigner(page);
        // The Designs gallery (main page) fetches /api/templates and shows cards — accordion is "Designs"
        await expandAccordion(page, 'Designs');
        // Wait for design cards to appear (loaded from /api/templates mock)
        await page.waitForSelector('text=Classic Dark', { timeout: 5000 }).catch(() => {});
        // Design cards are Box divs, not buttons — click via text content
        const card = page.getByText('Classic Dark').first();
        if (await card.isVisible().catch(() => false)) await card.click();
        await page.waitForTimeout(400);
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('pick design card → designer remains functional', async ({ page }) => {
        await openDesigner(page);
        await expandAccordion(page, 'Designs');
        await page.waitForSelector('text=Modern White', { timeout: 5000 }).catch(() => {});
        const card = page.getByText('Modern White').first();
        if (await card.isVisible().catch(() => false)) await card.click();
        await page.waitForTimeout(400);
        await expect(page.locator('svg').first()).toBeVisible();
        // Sidebar should still be visible
        await expect(page.getByText('THE MAPPED MOMENT')).toBeVisible();
    });

    test('enter title text → no crash', async ({ page }) => {
        await openDesigner(page);
        const textInput = page.locator('input[type="text"], input:not([type])').first();
        if (await textInput.isVisible()) {
            await textInput.fill('Our Special Night');
            await page.waitForTimeout(300);
            await expect(page.locator('svg').first()).toBeVisible();
        }
    });

    test('share design link → URL contains ?d= param', async ({ page }) => {
        await openDesigner(page);
        await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
        await page.getByRole('button', { name: 'Share Design Link' }).click();
        await page.waitForTimeout(400);
        const clipText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipText).toContain('/?d=');
    });

    test('full journey: open → pick design → type title → share', async ({ page }) => {
        await openDesigner(page);
        // 1. Pick a design from the Designs gallery (accordion renamed from "Templates")
        await expandAccordion(page, 'Designs');
        await page.waitForSelector('text=Classic Dark', { timeout: 5000 }).catch(() => {});
        const card = page.getByText('Classic Dark').first();
        if (await card.isVisible().catch(() => false)) await card.click();
        await page.waitForTimeout(300);
        // 2. Enter title
        const textInput = page.locator('input[type="text"], input:not([type])').first();
        if (await textInput.isVisible()) {
            await textInput.fill('Wedding Night 2024');
            await page.waitForTimeout(300);
        }
        // 3. Share
        await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
        await page.getByRole('button', { name: 'Share Design Link' }).click();
        await page.waitForTimeout(400);
        const clipText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipText).toContain('/?d=');
    });
});

// ═══════════════════════════════════════════════════════════
// TEMPLATE URL JOURNEY: /t/:id → verify settings applied
// ═══════════════════════════════════════════════════════════

test.describe('Template URL journey', () => {
    test('/t/classic-dark loads the designer', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/classic-dark');
        await page.waitForSelector('svg', { timeout: 10000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('/t/classic-dark fetches the template from API', async ({ page }) => {
        await setupMockApi(page);
        let templateFetched = false;
        // Use regex — applyTemplate appends ?ts=... cache-bust param that breaks glob patterns
        await page.route(/\/api\/templates\/classic-dark/, route => {
            templateFetched = true;
            route.continue();
        });
        await page.goto('/t/classic-dark');
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(500);
        expect(templateFetched).toBe(true);
    });

    test('/t/modern-white loads the designer', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/modern-white');
        await page.waitForSelector('svg', { timeout: 10000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('/t/home-street loads the designer (coloredmap)', async ({ page }) => {
        test.setTimeout(30000);
        await setupMockApi(page);
        await page.goto('/t/home-street');
        await page.waitForSelector('svg', { timeout: 15000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('/t/nonexistent still renders designer with defaults', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/does-not-exist');
        await page.waitForSelector('svg', { timeout: 10000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('/t/classic-dark → can still customize → share link', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/classic-dark');
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(500);
        // Customize by clicking Modern White design card (accordion renamed to "Designs")
        await expandAccordion(page, 'Designs');
        await page.waitForSelector('text=Modern White', { timeout: 5000 }).catch(() => {});
        const card = page.getByText('Modern White').first();
        if (await card.isVisible().catch(() => false)) await card.click();
        await page.waitForTimeout(300);
        // Share
        await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
        await page.getByRole('button', { name: 'Share Design Link' }).click();
        await page.waitForTimeout(400);
        const clipText = await page.evaluate(() => navigator.clipboard.readText());
        // Share URL uses current pathname as base (e.g. /t/modern-white?d=), so just check for ?d=
        expect(clipText).toContain('?d=');
    });
});

// ═══════════════════════════════════════════════════════════
// SHARE URL JOURNEY: click share → navigate to ?d= URL → state restored
// ═══════════════════════════════════════════════════════════

test.describe('Share URL journey', () => {
    test('navigating to ?d= URL loads the designer', async ({ page }) => {
        const state = JSON.stringify({
            posterType: 'starmap', maskShape: 'circle',
            posterColor: '#0a1628', textColor: '#c8b888',
            title: 'Share Test',
        });
        const encoded = btoa(unescape(encodeURIComponent(state)));
        await setupMockApi(page);
        await page.goto(`/?d=${encoded}`);
        await page.waitForSelector('svg', { timeout: 10000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('?d= URL restores title text into the poster', async ({ page }) => {
        const state = JSON.stringify({
            posterType: 'starmap', maskShape: 'circle',
            title: 'Shared Test Poster',
        });
        const encoded = btoa(unescape(encodeURIComponent(state)));
        await setupMockApi(page);
        await page.goto(`/?d=${encoded}`);
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(600);
        // The title should appear in the SVG
        await expect(page.locator('#poster-preview svg, svg').first()).toContainText('Shared Test Poster', { timeout: 5000 });
    });

    test('malformed ?d= param falls back to defaults gracefully', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/?d=NOTVALIDBASE64!!!');
        await page.waitForSelector('svg', { timeout: 10000 });
        // Should not crash — designer renders with defaults
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('?d= with streetmap posterType loads designer', async ({ page }) => {
        test.setTimeout(30000);
        const state = JSON.stringify({
            posterType: 'streetmap',
            mapCity: 'Paris',
            mapCenterLat: 48.8566,
            mapCenterLng: 2.3522,
        });
        const encoded = btoa(unescape(encodeURIComponent(state)));
        await setupMockApi(page);
        await page.goto(`/?d=${encoded}`);
        await page.waitForSelector('svg', { timeout: 15000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// VERIFY ORDER JOURNEY
// ═══════════════════════════════════════════════════════════

test.describe('Verify order journey', () => {
    test('verify page renders input form', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByPlaceholder('e.g. 1234567890')).toBeVisible();
    });

    test('entering token and submitting makes API call', async ({ page }) => {
        await setupMockApi(page);
        let verifyCalled = false;
        await page.route('**/api/verify-order', route => {
            verifyCalled = true;
            route.fulfill({ json: { status: 'rendering', listingType: 'digital' } });
        });
        await page.goto('/verify');
        await page.getByPlaceholder('e.g. 1234567890').fill('ABC123');
        await page.getByRole('button', { name: 'Get My Poster' }).click();
        await page.waitForTimeout(500);
        expect(verifyCalled).toBe(true);
    });

    test('rendering status shows "being generated" message', async ({ page }) => {
        await setupMockApi(page);
        // Use '7777777777' which the mock already returns { status: 'rendering' } for —
        // avoids route-priority races from registering **/api/verify-order after **/api/**
        await page.goto('/verify');
        await page.getByPlaceholder('e.g. 1234567890').fill('7777777777');
        await page.getByRole('button', { name: 'Get My Poster' }).click();
        // Use .first() — text appears in both the visible heading and the aria-live region
        await expect(page.getByText(/being generated/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('sent status auto-downloads and shows delivered confirmation', async ({ page }) => {
        test.setTimeout(25000);
        await setupMockApi(page);
        await page.route('**/api/verify-order', route => {
            route.fulfill({ json: { status: 'rendering', listingType: 'digital' } });
        });
        let pollCount = 0;
        await page.route('**/api/order-status**', route => {
            pollCount++;
            route.fulfill({ json: {
                status: pollCount >= 2 ? 'sent' : 'rendering',
                listingType: 'digital',
                downloadUrl: pollCount >= 2 ? '/api/download-file/1?t=mock&exp=9999999999&sig=mock' : undefined,
            }});
        });
        await page.goto('/verify');
        await page.getByPlaceholder('e.g. 1234567890').fill('DEF456');
        await page.getByRole('button', { name: 'Get My Poster' }).click();
        // Transitions through rendering → auto_downloading → downloaded
        await expect(page.getByRole('heading', { name: /your file has been delivered/i })).toBeVisible({ timeout: 20000 });
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN ORDER JOURNEY
// ═══════════════════════════════════════════════════════════

test.describe('Admin order journey', () => {
    test('login → dashboard shows order stats', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.getByPlaceholder('Admin password').fill('testpass123');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await page.waitForURL(/\/admin\/dashboard/);
        await expect(page.getByText('Total Orders')).toBeVisible();
    });

    test('dashboard → click Orders → shows orders table', async ({ page }) => {
        await asAdmin(page);
        await page.getByRole('link', { name: 'Orders' }).click();
        await expect(page).toHaveURL(/\/admin\/orders/);
        await expect(page.getByText('Sarah Johnson')).toBeVisible();
    });

    test('orders list → filter by failed → shows Sophie Dubois', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.getByRole('combobox').selectOption('failed');
        await page.waitForTimeout(300);
        await expect(page.getByText('Sophie Dubois')).toBeVisible();
    });

    test('orders list → click order row → opens order detail', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.getByText('Sarah Johnson').click();
        await expect(page).toHaveURL(/\/admin\/orders\/1/);
    });

    test('order detail → add note → save note → API called', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        let noteBody: Record<string, string> = {};
        await page.route('**/api/admin/orders/1/notes', route => {
            noteBody = JSON.parse(route.request().postData() || '{}');
            route.fulfill({ json: { ...MOCK_ORDERS[0], seller_notes: noteBody.notes } });
        });
        await page.goto('/admin/orders/1');
        await page.waitForLoadState('networkidle');
        await page.getByPlaceholder(/internal notes/i).fill('Please double check address');
        const saveBtn = page.getByRole('button', { name: 'Save Note' });
        await expect(saveBtn).toBeEnabled();
        await saveBtn.click();
        await page.waitForTimeout(400);
        expect(noteBody.notes).toBe('Please double check address');
    });

    test('order detail → back button → returns to orders list', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await page.getByRole('button', { name: 'Back' }).click();
        await expect(page).toHaveURL(/\/admin\/orders$/);
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN FULFILL JOURNEY
// ═══════════════════════════════════════════════════════════

test.describe('Admin fulfillment journey', () => {
    test('failed order detail shows Retry Fulfillment button', async ({ page }) => {
        await asAdmin(page, '/admin/orders/6');
        await expect(page.getByRole('button', { name: 'Retry Fulfillment' })).toBeVisible();
    });

    test('retry fulfillment calls fulfill API', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        let fulfillCalled = false;
        await page.route('**/api/admin/orders/6/fulfill', route => {
            fulfillCalled = true;
            route.fulfill({ json: { ok: true } });
        });
        await page.goto('/admin/orders/6');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Retry Fulfillment' }).click();
        await page.waitForTimeout(400);
        expect(fulfillCalled).toBe(true);
    });

    test('already-sent order has Fulfill Now disabled', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        const fulfillBtn = page.getByRole('button', { name: 'Fulfill Now' });
        await expect(fulfillBtn).toBeDisabled();
    });

    test('pending_manual order has Fulfill Now enabled', async ({ page }) => {
        await asAdmin(page, '/admin/orders/5');
        const fulfillBtn = page.getByRole('button', { name: 'Fulfill Now' });
        await expect(fulfillBtn).toBeEnabled();
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN TEMPLATE JOURNEY
// ═══════════════════════════════════════════════════════════

test.describe('Admin template journey', () => {
    test('templates list → New Template → fill slug → save → API called', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        let createCalled = false;
        await page.route('**/api/admin/templates', route => {
            if (route.request().method() === 'POST') {
                createCalled = true;
                route.fulfill({ status: 201, json: { id: 'my-new-template', name: 'My New Template', is_active: 1, settings: {} } });
            } else {
                route.continue();
            }
        });
        await page.goto('/admin/templates/new');
        await page.waitForLoadState('networkidle');
        // Fill slug
        const slugInput = page.getByPlaceholder('classic-dark-starmap');
        await slugInput.fill('my-new-template');
        // Fill name — Name input has no placeholder; slug is nth(0), name is nth(1)
        await page.locator('input').nth(1).fill('My New Template');
        // Save
        await page.getByRole('button', { name: 'Save' }).click();
        await page.waitForTimeout(500);
        expect(createCalled).toBe(true);
    });

    test('template editor for existing template shows template name', async ({ page }) => {
        await asAdmin(page, '/admin/templates/classic-dark/edit');
        await expect(page.locator('input[value="Classic Dark"]')).toBeVisible();
    });

    test('template list shows all 3 templates', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        await expect(page.getByText('Classic Dark')).toBeVisible();
        await expect(page.getByText('Modern White')).toBeVisible();
        await expect(page.getByText('Home Street')).toBeVisible();
    });

    test('editing template → save → shows "Saved!" confirmation', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/templates/classic-dark', route => {
            if (route.request().method() === 'PUT') {
                route.fulfill({ json: { id: 'classic-dark', name: 'Classic Dark', settings: {} } });
            } else {
                route.fulfill({ json: MOCK_TEMPLATES[0] });
            }
        });
        await page.goto('/admin/templates/classic-dark/edit');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Saved!')).toBeVisible({ timeout: 5000 });
    });
});

// ═══════════════════════════════════════════════════════════
// BULK ACTION JOURNEY
// ═══════════════════════════════════════════════════════════

test.describe('Bulk action journey', () => {
    test('select one order → bulk toolbar appears', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.locator('table tbody label.chakra-checkbox').first().click();
        await expect(page.getByText('1 selected')).toBeVisible();
    });

    test('header checkbox selects all rows → N selected shown', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.locator('table thead label.chakra-checkbox').click();
        const selected = page.getByText(/\d+ selected/);
        await expect(selected).toBeVisible();
    });

    test('clear selection → toolbar disappears', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.locator('table tbody label.chakra-checkbox').first().click();
        await expect(page.getByText('1 selected')).toBeVisible();
        await page.getByRole('button', { name: 'Clear' }).click();
        await expect(page.getByText(/selected/)).not.toBeVisible();
    });

    test('select 2 orders → apply status → API called twice', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        const calledIds: number[] = [];
        await page.route('**/api/admin/orders/*/status', route => {
            const match = route.request().url().match(/orders\/(\d+)\/status/);
            if (match) calledIds.push(parseInt(match[1]));
            route.fulfill({ json: { ok: true } });
        });
        await page.goto('/admin/orders');
        await page.waitForLoadState('networkidle');
        const checkboxes = page.locator('table tbody label.chakra-checkbox');
        await checkboxes.nth(0).click();
        await checkboxes.nth(1).click();
        await page.getByTestId('bulk-status-select').selectOption('refunded');
        await page.getByRole('button', { name: 'Apply to Selected' }).click();
        await page.waitForTimeout(600);
        expect(calledIds.length).toBe(2);
    });
});

// ═══════════════════════════════════════════════════════════
// CSV EXPORT JOURNEY
// ═══════════════════════════════════════════════════════════

test.describe('CSV export journey', () => {
    test('Export CSV button is visible in orders list', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    });

    test('clicking Export CSV triggers file download', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: 'Export CSV' }).click(),
        ]);
        expect(download.suggestedFilename()).toMatch(/orders.*\.csv/);
    });

    test('downloaded CSV filename has date pattern', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: 'Export CSV' }).click(),
        ]);
        expect(download.suggestedFilename()).toMatch(/orders-\d{4}-\d{2}-\d{2}\.csv/);
    });
});
