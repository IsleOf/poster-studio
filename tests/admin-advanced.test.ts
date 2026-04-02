/**
 * Advanced admin tests — revenue panel, status badge links, order detail actions,
 * bulk selection, CSV export, font role checkboxes.
 * All API calls are mocked via setupMockApi.
 */
import { test, expect, Page } from '@playwright/test';
import { setupMockApi, MOCK_ORDERS } from './fixtures/mockApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function asAdmin(page: Page, path = '/admin/dashboard') {
    await setupMockApi(page, { loggedIn: true });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
}

// ═══════════════════════════════════════════════════════════
// REVENUE PANEL
// ═══════════════════════════════════════════════════════════

test.describe('Revenue panel', () => {
    test('shows "Revenue (fulfilled orders)" heading', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Revenue (fulfilled orders)')).toBeVisible();
    });

    test('shows total revenue of $175.00', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('$175.00')).toBeVisible();
    });

    test('shows Digital revenue label', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Digital')).toBeVisible();
    });

    test('shows Print revenue label', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Print')).toBeVisible();
    });

    test('shows $75.00 for digital revenue', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('$75.00')).toBeVisible();
    });

    test('shows $100.00 for print revenue', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('$100.00')).toBeVisible();
    });

    test('shows sparkline chart (svg rect elements inside revenue section)', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Order trend')).toBeVisible();
        // Sparkline rendered as SVG rects
        const rects = page.locator('svg rect');
        const count = await rects.count();
        expect(count).toBeGreaterThan(0);
    });

    test('shows "Order trend" label near sparkline', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Order trend')).toBeVisible();
    });

    test('shows Avg. Processing time card', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Avg. Processing')).toBeVisible();
    });

    test('shows "2h" average processing time', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('2h')).toBeVisible();
    });

    test('shows Fulfillment Rate card', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Fulfillment Rate')).toBeVisible();
    });

    test('shows 86% fulfillment rate', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('86%')).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// STATUS BADGE LINKS
// ═══════════════════════════════════════════════════════════

test.describe('Status badge links on dashboard', () => {
    test('failed badge is visible on dashboard', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.locator('.chakra-badge').filter({ hasText: 'failed' })).toBeVisible();
    });

    test('clicking failed badge navigates to orders?status=failed', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await page.locator('.chakra-badge').filter({ hasText: 'failed' }).click();
        await expect(page).toHaveURL(/status=failed/);
    });

    test('pending badge is visible on dashboard', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.locator('.chakra-badge').filter({ hasText: 'pending' }).first()).toBeVisible();
    });

    test('sent badge is visible on dashboard', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.locator('.chakra-badge').filter({ hasText: 'sent' })).toBeVisible();
    });

    test('status badges in orders table show correct values', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        const badges = page.locator('table .chakra-badge');
        await expect(badges.filter({ hasText: 'sent' })).toBeVisible();
        await expect(badges.filter({ hasText: 'failed' })).toBeVisible();
        await expect(badges.filter({ hasText: 'fulfilled' })).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// ORDER DETAIL — SELLER NOTES
// ═══════════════════════════════════════════════════════════

test.describe('Order detail — seller notes', () => {
    test('seller notes textarea is visible', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await expect(page.getByPlaceholder(/internal notes/i)).toBeVisible();
    });

    test('Save Note button is disabled when notes unchanged', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        const saveBtn = page.getByRole('button', { name: 'Save Note' });
        await expect(saveBtn).toBeDisabled();
    });

    test('Save Note button enables after typing in notes', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await page.getByPlaceholder(/internal notes/i).fill('Follow up needed');
        const saveBtn = page.getByRole('button', { name: 'Save Note' });
        await expect(saveBtn).toBeEnabled();
    });

    test('clicking Save Note calls the notes API with correct body', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        let capturedBody: Record<string, string> = {};
        await page.route('**/api/admin/orders/1/notes', route => {
            capturedBody = JSON.parse(route.request().postData() || '{}');
            route.fulfill({ json: { ...MOCK_ORDERS[0], seller_notes: capturedBody.notes } });
        });
        await page.goto('/admin/orders/1');
        await page.waitForLoadState('networkidle');
        await page.getByPlaceholder(/internal notes/i).fill('Priority shipping required');
        await page.getByRole('button', { name: 'Save Note' }).click();
        await page.waitForTimeout(400);
        expect(capturedBody.notes).toBe('Priority shipping required');
    });

    test('notes API endpoint uses PATCH method', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        let methodUsed = '';
        await page.route('**/api/admin/orders/1/notes', route => {
            methodUsed = route.request().method();
            route.fulfill({ json: { ok: true } });
        });
        await page.goto('/admin/orders/1');
        await page.waitForLoadState('networkidle');
        await page.getByPlaceholder(/internal notes/i).fill('Some note');
        await page.getByRole('button', { name: 'Save Note' }).click();
        await page.waitForTimeout(400);
        expect(methodUsed).toBe('PATCH');
    });
});

// ═══════════════════════════════════════════════════════════
// ORDER DETAIL — RETRY FULFILLMENT
// ═══════════════════════════════════════════════════════════

test.describe('Order detail — retry fulfillment', () => {
    test('failed order (id=6) shows Retry Fulfillment button', async ({ page }) => {
        await asAdmin(page, '/admin/orders/6');
        await expect(page.getByRole('button', { name: 'Retry Fulfillment' })).toBeVisible();
    });

    test('Retry Fulfillment calls fulfill endpoint with POST', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        let methodUsed = '';
        await page.route('**/api/admin/orders/6/fulfill', route => {
            methodUsed = route.request().method();
            route.fulfill({ json: { ok: true, status: 'sent' } });
        });
        await page.goto('/admin/orders/6');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Retry Fulfillment' }).click();
        await page.waitForTimeout(400);
        expect(methodUsed).toBe('POST');
    });

    test('Retry Fulfillment button is only shown for failed orders', async ({ page }) => {
        // Order 1 is 'sent' — should not show Retry
        await asAdmin(page, '/admin/orders/1');
        const retryBtn = page.getByRole('button', { name: 'Retry Fulfillment' });
        await expect(retryBtn).not.toBeVisible();
    });

    test('Fulfill Now is disabled for already-sent orders', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        const fulfillBtn = page.getByRole('button', { name: 'Fulfill Now' });
        await expect(fulfillBtn).toBeDisabled();
    });

    test('Fulfill Now is enabled for rendered orders (id=3)', async ({ page }) => {
        await asAdmin(page, '/admin/orders/3');
        const fulfillBtn = page.getByRole('button', { name: 'Fulfill Now' });
        await expect(fulfillBtn).toBeEnabled();
    });

    test('Fulfill Now for rendered order calls fulfill API', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        let called = false;
        await page.route('**/api/admin/orders/3/fulfill', route => {
            called = true;
            route.fulfill({ json: { ok: true } });
        });
        await page.goto('/admin/orders/3');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Fulfill Now' }).click();
        await page.waitForTimeout(400);
        expect(called).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════
// BULK ACTIONS
// ═══════════════════════════════════════════════════════════

test.describe('Bulk actions', () => {
    test('checkboxes appear in orders table', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        const checkboxes = page.locator('table tbody label.chakra-checkbox');
        expect(await checkboxes.count()).toBeGreaterThan(0);
    });

    test('clicking a row checkbox shows "1 selected"', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.locator('table tbody label.chakra-checkbox').first().click();
        await expect(page.getByText('1 selected')).toBeVisible();
    });

    test('bulk toolbar appears after selecting a row', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.locator('table tbody label.chakra-checkbox').first().click();
        await expect(page.getByTestId('bulk-status-select')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Apply to Selected' })).toBeVisible();
    });

    test('header checkbox selects all rows', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.locator('table thead label.chakra-checkbox').click();
        const selected = page.getByText(/\d+ selected/);
        await expect(selected).toBeVisible();
    });

    test('header checkbox shows "7 selected" (all orders)', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.locator('table thead label.chakra-checkbox').click();
        await expect(page.getByText('7 selected')).toBeVisible();
    });

    test('Clear button deselects all rows', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.locator('table tbody label.chakra-checkbox').first().click();
        await expect(page.getByText('1 selected')).toBeVisible();
        await page.getByRole('button', { name: 'Clear' }).click();
        await expect(page.getByText(/selected/)).not.toBeVisible();
    });

    test('Clear hides the bulk toolbar', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.locator('table tbody label.chakra-checkbox').first().click();
        await expect(page.getByTestId('bulk-status-select')).toBeVisible();
        await page.getByRole('button', { name: 'Clear' }).click();
        await expect(page.getByTestId('bulk-status-select')).not.toBeVisible();
    });

    test('Apply to Selected calls status API for each selected order', async ({ page }) => {
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
        await page.waitForTimeout(700);
        expect(calledIds.length).toBe(2);
    });

    test('Apply to Selected uses PATCH method', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        const methods: string[] = [];
        await page.route('**/api/admin/orders/*/status', route => {
            methods.push(route.request().method());
            route.fulfill({ json: { ok: true } });
        });
        await page.goto('/admin/orders');
        await page.waitForLoadState('networkidle');
        await page.locator('table tbody label.chakra-checkbox').first().click();
        await page.getByTestId('bulk-status-select').selectOption('refunded');
        await page.getByRole('button', { name: 'Apply to Selected' }).click();
        await page.waitForTimeout(500);
        expect(methods.every(m => m === 'PATCH')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════════════

test.describe('CSV export', () => {
    test('Export CSV button is visible', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    });

    test('Export CSV triggers file download', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: 'Export CSV' }).click(),
        ]);
        expect(download).toBeTruthy();
    });

    test('downloaded file has correct filename pattern', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: 'Export CSV' }).click(),
        ]);
        expect(download.suggestedFilename()).toMatch(/orders-\d{4}-\d{2}-\d{2}\.csv/);
    });

    test('Export CSV button is still visible after filtering', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.getByRole('combobox').selectOption('failed');
        await page.waitForTimeout(300);
        await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// FONT ROLES
// ═══════════════════════════════════════════════════════════

test.describe('Font roles UI', () => {
    test('upload form shows "Show this font in which text slots?" label', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByText('Show this font in which text slots?')).toBeVisible();
    });

    test('shows 4 role labels: Title, Subtitle, Details, Dedication', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        for (const role of ['Title', 'Subtitle', 'Details', 'Dedication']) {
            await expect(page.getByText(role).first()).toBeVisible();
        }
    });

    test('Title role description "Large display text" is visible', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByText('Large display text')).toBeVisible();
    });

    test('Details role hint about small/readable fonts is visible', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByText(/Coordinates.*small|small.*readable|small — readable/i).first()).toBeVisible();
    });

    test('font upload form has name input', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByPlaceholder('e.g. Bebas Neue').first()).toBeVisible();
    });

    test('font upload form has Upload button', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByRole('button', { name: 'Upload' }).first()).toBeVisible();
    });

    test('Fonts tab is active by default', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByRole('tab', { name: 'Fonts' })).toBeVisible();
    });

    test('all 3 tabs present: Fonts, SVG Shapes, Images', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByRole('tab', { name: 'Fonts' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'SVG Shapes' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Images' })).toBeVisible();
    });

    test('empty state message shown when no fonts uploaded', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByText(/No fonts uploaded yet/i)).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════

test.describe('Dashboard stat cards', () => {
    test('shows Total Orders card with value 7', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Total Orders')).toBeVisible();
        await expect(page.getByText('7').first()).toBeVisible();
    });

    test('shows Today count', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Today')).toBeVisible();
    });

    test('shows This Week count', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('This Week')).toBeVisible();
    });

    test('shows Pending Action count of 3', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Pending Action')).toBeVisible();
        await expect(page.getByText('3').first()).toBeVisible();
    });

    test('nav links are all accessible from dashboard', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        for (const label of ['Dashboard', 'Orders', 'Templates', 'Etsy', 'Assets', 'Settings']) {
            await expect(page.getByRole('link', { name: label })).toBeVisible();
        }
    });
});
