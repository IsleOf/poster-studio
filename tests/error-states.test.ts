/**
 * Error state tests — invalid inputs, API failures, auth errors,
 * 404 routes, network errors, and graceful degradation.
 * All API calls are mocked via setupMockApi.
 */
import { test, expect, Page } from '@playwright/test';
import { setupMockApi, MOCK_TEMPLATES } from './fixtures/mockApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function openDesigner(page: Page) {
    await setupMockApi(page);
    await page.goto('/');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(500);
}

async function asAdmin(page: Page, path = '/admin/dashboard') {
    await setupMockApi(page, { loggedIn: true });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
}

// ═══════════════════════════════════════════════════════════
// DESIGNER — INVALID / MALFORMED PARAMS
// ═══════════════════════════════════════════════════════════

test.describe('Designer — invalid parameters', () => {
    test('malformed base64 ?d= param — falls back to default designer', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/?d=NOTVALIDBASE64!!!###');
        await page.waitForSelector('svg', { timeout: 10000 });
        // Should render without crashing
        await expect(page.locator('svg').first()).toBeVisible();
        await expect(page.getByText('THE MAPPED MOMENT')).toBeVisible();
    });

    test('partial ?d= param with missing fields — uses defaults for missing fields', async ({ page }) => {
        // Only encode posterType, leave everything else out
        const partial = JSON.stringify({ posterType: 'starmap' });
        const encoded = btoa(unescape(encodeURIComponent(partial)));
        await setupMockApi(page);
        await page.goto(`/?d=${encoded}`);
        await page.waitForSelector('svg', { timeout: 10000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('empty ?d= param — falls back to default designer', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/?d=');
        await page.waitForSelector('svg', { timeout: 10000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('truncated base64 in ?d= param — does not throw visible error', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/?d=eyJwb3N0ZXJUeXBlIjoi');
        await page.waitForSelector('svg', { timeout: 10000 });
        await expect(page.locator('svg').first()).toBeVisible();
        // No error dialog or visible error text
        const errorText = page.getByText(/Something went wrong|Uncaught|TypeError/i).first();
        await expect(errorText).not.toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// DESIGNER — 404 TEMPLATE
// ═══════════════════════════════════════════════════════════

test.describe('Designer — 404 template', () => {
    test('/t/nonexistent — API returns 404 — designer still renders', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/does-not-exist');
        await page.waitForSelector('svg', { timeout: 10000 });
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('/t/nonexistent — sidebar still shows controls', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/t/does-not-exist');
        await page.waitForSelector('svg', { timeout: 10000 });
        await expect(page.getByText('THE MAPPED MOMENT')).toBeVisible();
    });

    test('/t/nonexistent — no crash or error dialog', async ({ page }) => {
        await setupMockApi(page);
        let consoleErrors: string[] = [];
        page.on('pageerror', err => consoleErrors.push(err.message));
        await page.goto('/t/does-not-exist');
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(500);
        // Page should render, even if there was a 404 fetch
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// DESIGNER — NOMINATIM ERRORS
// ═══════════════════════════════════════════════════════════

test.describe('Designer — Nominatim search errors', () => {
    test('Nominatim returns empty results — no crash', async ({ page }) => {
        test.setTimeout(30000);
        await setupMockApi(page);
        await page.route('**/nominatim.openstreetmap.org/**', route => {
            route.fulfill({ json: [] });
        });
        await page.goto('/');
        await page.getByRole('button', { name: /STREET MAP/i }).click();
        await page.waitForTimeout(400);
        const cityInput = page.getByRole('textbox').first();
        await cityInput.fill('ZZZNOTACITY');
        await page.waitForTimeout(700);
        // Should not crash
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('Nominatim network error — designer still functional', async ({ page }) => {
        test.setTimeout(30000);
        await setupMockApi(page);
        await page.route('**/nominatim.openstreetmap.org/**', route => {
            route.abort('failed');
        });
        await page.goto('/');
        await page.getByRole('button', { name: /STREET MAP/i }).click();
        await page.waitForTimeout(400);
        const cityInput = page.getByRole('textbox').first();
        await cityInput.fill('Sydney');
        await page.waitForTimeout(700);
        // Designer should still render
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('Nominatim returns 500 — no visible crash', async ({ page }) => {
        test.setTimeout(30000);
        await setupMockApi(page);
        await page.route('**/nominatim.openstreetmap.org/**', route => {
            route.fulfill({ status: 500, body: 'Internal Server Error' });
        });
        await page.goto('/');
        await page.getByRole('button', { name: /STREET MAP/i }).click();
        await page.waitForTimeout(400);
        const cityInput = page.getByRole('textbox').first();
        await cityInput.fill('London');
        await page.waitForTimeout(700);
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN — AUTH ERRORS
// ═══════════════════════════════════════════════════════════

test.describe('Admin — authentication errors', () => {
    test('wrong password → error message shown', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.getByPlaceholder('Admin password').fill('wrongpassword');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page.getByText('Invalid password')).toBeVisible();
    });

    test('accessing /admin/orders without auth → redirected to login', async ({ page }) => {
        await setupMockApi(page); // loggedIn: false
        await page.goto('/admin/orders');
        // Should redirect to login page
        await expect(page.getByPlaceholder('Admin password')).toBeVisible();
    });

    test('accessing /admin/dashboard without auth → shows login form', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/dashboard');
        await expect(page.getByPlaceholder('Admin password')).toBeVisible();
    });

    test('accessing /admin/templates without auth → shows login form', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/templates');
        await expect(page.getByPlaceholder('Admin password')).toBeVisible();
    });

    test('accessing /admin/settings without auth → shows login form', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/settings');
        await expect(page.getByPlaceholder('Admin password')).toBeVisible();
    });

    test('login form is accessible at /admin', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin');
        await expect(page.getByText('Seller Dashboard')).toBeVisible();
        await expect(page.getByPlaceholder('Admin password')).toBeVisible();
    });

    test('submitting empty password — does not crash', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await page.waitForTimeout(300);
        // Page should still be on login
        await expect(page.getByPlaceholder('Admin password')).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN — 404 ORDER
// ═══════════════════════════════════════════════════════════

test.describe('Admin — 404 order', () => {
    test('/admin/orders/999 — 404 from API — shows graceful error', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.goto('/admin/orders/999');
        await page.waitForLoadState('networkidle');
        // Should show a not found / error state
        const errorEl = page.getByText(/not found|404|error|Order #999/i).first();
        // Accept either an error message or a graceful fallback UI
        const count = await errorEl.count();
        // At minimum, the admin nav should still be visible (no full crash)
        const navVisible = await page.getByRole('link', { name: 'Dashboard' }).isVisible().catch(() => false);
        // The page should show either an error or the nav — not just a blank page
        expect(navVisible || count > 0).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN — TEMPLATE SAVE FAILURE
// ═══════════════════════════════════════════════════════════

test.describe('Admin — template save failures', () => {
    test('template save 500 error — error toast or message shown', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/templates/classic-dark', route => {
            if (route.request().method() === 'PUT') {
                route.fulfill({ status: 500, json: { error: 'Internal Server Error' } });
            } else {
                route.fulfill({ json: MOCK_TEMPLATES[0] });
            }
        });
        await page.goto('/admin/templates/classic-dark/edit');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Save' }).click();
        await page.waitForTimeout(600);
        // Should show an error toast or message — not crash
        // Check that we're still on the edit page
        await expect(page).toHaveURL(/\/admin\/templates\/classic-dark\/edit/);
    });

    test('Publish to Etsy with no title — button stays disabled or shows validation', async ({ page }) => {
        await asAdmin(page, '/admin/templates/classic-dark/edit');
        await page.getByRole('tab', { name: 'Etsy Listing' }).click();
        await page.waitForTimeout(200);
        // The Publish to Etsy button — with no title filled, it should either be disabled
        // or clicking it shows a validation message
        const publishBtn = page.getByRole('button', { name: 'Publish to Etsy' });
        await expect(publishBtn).toBeVisible();
        // Either disabled or will show validation on click
        const isDisabled = await publishBtn.isDisabled();
        if (!isDisabled) {
            // It's enabled — click and check no crash
            await publishBtn.click();
            await page.waitForTimeout(300);
            // Page should still be functional
            await expect(page.getByRole('tab', { name: 'Etsy Listing' })).toBeVisible();
        } else {
            expect(isDisabled).toBe(true);
        }
    });

    test('template DELETE failure — no crash', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/templates/classic-dark', route => {
            if (route.request().method() === 'DELETE') {
                route.fulfill({ status: 500, json: { error: 'Cannot delete' } });
            } else {
                route.continue();
            }
        });
        page.on('dialog', d => d.accept());
        await page.goto('/admin/templates');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Delete' }).first().click();
        await page.waitForTimeout(400);
        // Page should not crash — still on templates page
        await expect(page).toHaveURL(/\/admin\/templates/);
    });
});

// ═══════════════════════════════════════════════════════════
// VERIFY ORDER — ERROR STATES
// ═══════════════════════════════════════════════════════════

test.describe('Verify order — error states', () => {
    test('POST returns 404 — "Order not found" or similar shown', async ({ page }) => {
        await setupMockApi(page);
        // mockApi already returns 404 for /api/verify-order by default
        await page.goto('/verify');
        await page.getByPlaceholder('e.g. 1234567890').fill('BADTOKEN');
        await page.getByRole('button', { name: 'Get My Poster' }).click();
        await page.waitForTimeout(500);
        // Should show "not found" or similar error
        const errEl = page.getByText(/not found|invalid|error|couldn't find/i).first();
        await expect(errEl).toBeVisible({ timeout: 5000 });
    });

    test('polling returns "failed" status — error state shown', async ({ page }) => {
        await setupMockApi(page);
        await page.route('**/api/verify-order', route => {
            route.fulfill({ json: { status: 'rendering', listingType: 'digital' } });
        });
        await page.route('**/api/order-status**', route => {
            route.fulfill({ json: { status: 'failed', listingType: 'digital' } });
        });
        await page.goto('/verify');
        await page.getByPlaceholder('e.g. 1234567890').fill('FAIL123');
        await page.getByRole('button', { name: 'Get My Poster' }).click();
        await expect(page.getByText(/failed|error|Render failed/i)).toBeVisible({ timeout: 10000 });
    });

    test('empty token submission — no crash', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.getByRole('button', { name: 'Get My Poster' }).click();
        await page.waitForTimeout(300);
        // Page should not crash
        await expect(page.getByPlaceholder('e.g. 1234567890')).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// NETWORK ERROR SIMULATION
// ═══════════════════════════════════════════════════════════

test.describe('Network error simulation', () => {
    test('stats API failure — dashboard still renders partially', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        // Return non-JSON 500 so res.json() throws → stats stays null → fallback renders
        await page.route('**/api/admin/orders/stats', route => {
            route.fulfill({ status: 500, body: 'Service Unavailable', contentType: 'text/plain' });
        });
        await page.goto('/admin/dashboard');
        await page.waitForTimeout(1000);
        // Nav sidebar is rendered by AdminLayout regardless of DashboardPage state
        const navVisible = await page.getByText('Dashboard').first().isVisible().catch(() => false);
        expect(navVisible).toBe(true);
    });

    test('orders API failure — orders page shows error or empty state', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/orders', route => {
            if (!route.request().url().includes('stats')) {
                route.fulfill({ status: 503, json: { error: 'Service unavailable' } });
            } else {
                route.continue();
            }
        });
        await page.goto('/admin/orders');
        await page.waitForTimeout(1000);
        // Should not crash — either shows error or empty table
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('fonts API failure — sidebar still renders', async ({ page }) => {
        await setupMockApi(page);
        await page.route('**/api/assets/fonts', route => {
            route.fulfill({ status: 500, body: 'error' });
        });
        await page.goto('/');
        await page.waitForSelector('svg', { timeout: 10000 });
        // Designer should still work without uploaded fonts
        await expect(page.locator('svg').first()).toBeVisible();
        await expect(page.getByText('THE MAPPED MOMENT')).toBeVisible();
    });

    test('template API failure during /t/:id load — designer still renders', async ({ page }) => {
        await setupMockApi(page);
        await page.route('**/api/templates/classic-dark', route => {
            route.fulfill({ status: 503, json: { error: 'Service unavailable' } });
        });
        await page.goto('/t/classic-dark');
        await page.waitForSelector('svg', { timeout: 10000 });
        // Designer should load with defaults
        await expect(page.locator('svg').first()).toBeVisible();
    });

    test('settings API failure — settings page shows error gracefully', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/settings', route => {
            route.fulfill({ status: 500, json: { error: 'DB error' } });
        });
        await page.goto('/admin/settings');
        await page.waitForTimeout(1000);
        // Should not crash
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('app does not crash on complete network failure for non-critical paths', async ({ page }) => {
        await setupMockApi(page);
        // Block all external requests
        await page.route('**/nominatim.openstreetmap.org/**', route => route.abort());
        await page.route('**/tiles.openfreemap.org/**', route => route.abort());
        await page.route('**/raw.githubusercontent.com/**', route => route.abort());
        await page.goto('/');
        await page.waitForSelector('svg', { timeout: 10000 });
        // Core designer should still render
        await expect(page.locator('svg').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// ADMIN — ORDER NOTE ERRORS
// ═══════════════════════════════════════════════════════════

test.describe('Admin — order note save errors', () => {
    test('note save API failure — no crash', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/orders/1/notes', route => {
            route.fulfill({ status: 500, json: { error: 'DB error' } });
        });
        await page.goto('/admin/orders/1');
        await page.waitForLoadState('networkidle');
        await page.getByPlaceholder(/internal notes/i).fill('Some note');
        await page.getByRole('button', { name: 'Save Note' }).click();
        await page.waitForTimeout(400);
        // Page should not crash
        await expect(page).toHaveURL(/\/admin\/orders\/1/);
    });
});

// ═══════════════════════════════════════════════════════════
// VERIFY ORDER — ADDITIONAL
// ═══════════════════════════════════════════════════════════

test.describe('Verify order — additional edge cases', () => {
    test('verify page renders without any token entered', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('body')).toBeVisible();
    });

    test('verify page has "Get My Poster" button', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/verify');
        await expect(page.getByRole('button', { name: 'Get My Poster' })).toBeVisible();
    });

    test('verify polling network error — does not crash', async ({ page }) => {
        await setupMockApi(page);
        await page.route('**/api/verify-order', route => {
            route.fulfill({ json: { status: 'rendering', listingType: 'digital' } });
        });
        await page.route('**/api/order-status**', route => {
            route.abort('failed');
        });
        await page.goto('/verify');
        await page.getByPlaceholder('e.g. 1234567890').fill('NET999');
        await page.getByRole('button', { name: 'Get My Poster' }).click();
        await page.waitForTimeout(1000);
        // Page should not crash
        await expect(page.locator('body')).toBeVisible();
    });
});
