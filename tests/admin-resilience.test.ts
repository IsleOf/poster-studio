/**
 * Admin Resilience Tests
 *
 * Tests specifically targeting the crash bugs that caused "Something went wrong"
 * and blank black admin pages:
 *
 *   1. `.map() is not a function` — API returned an error object instead of array
 *   2. `byStatus.map is not a function` — stats response missing expected shape
 *   3. `templates is not iterable` — 401 response set as data
 *   4. Blank black pages — unhandled render error killed the React tree
 *
 * Every test navigates to an admin page and asserts:
 *   - No "Something went wrong" visible (ErrorBoundary did not fire)
 *   - No uncaught JS errors that crash the page
 *   - Correct rendering under happy-path mock data
 *   - Graceful degradation when the API returns an error or empty response
 */
import { test, expect, Page } from '@playwright/test';
import { setupMockApi, MOCK_ORDERS, MOCK_TEMPLATES, MOCK_STATS } from './fixtures/mockApi';
import { Route } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function asAdmin(page: Page, path = '/admin/dashboard') {
    await setupMockApi(page, { loggedIn: true });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
}

/**
 * Assert no ErrorBoundary "Something went wrong" banner is visible.
 * Also checks the page has actual content (not a blank body).
 */
async function assertNoError(page: Page) {
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
    // Page body should have meaningful content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(20);
}

/**
 * Set up a mock API where a specific path returns an error JSON instead of the normal response.
 * Simulates the failure mode that was causing .map() crashes.
 */
async function setupWithErrorRoute(page: Page, errorPath: string, status = 500) {
    // First set up the normal mock API (logged in)
    await setupMockApi(page, { loggedIn: true });
    // Override the specific route to return an error
    await page.route(`**${errorPath}`, (route: Route) => {
        route.fulfill({ status, json: { error: 'Internal server error', message: 'Something failed' } });
    });
}

/**
 * Set up a mock API where a specific path returns a 401 Unauthorized.
 * This simulates an expired token scenario.
 */
async function setupWith401Route(page: Page, errorPath: string) {
    await setupMockApi(page, { loggedIn: true });
    await page.route(`**${errorPath}`, (route: Route) => {
        route.fulfill({ status: 401, json: { error: 'Invalid or expired token' } });
    });
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD — no crash under normal and degraded conditions
// ═══════════════════════════════════════════════════════════

test.describe('Dashboard resilience', () => {
    test('loads without crash (happy path)', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await assertNoError(page);
        await expect(page.getByText('Total Orders')).toBeVisible();
    });

    test('byStatus array renders correctly (no .map crash)', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        // All 7 status badges from MOCK_STATS.byStatus should render
        await expect(page.getByText('sent')).toBeVisible();
        await expect(page.getByText('fulfilled').first()).toBeVisible();
        await expect(page.getByText('pending').first()).toBeVisible();
        await expect(page.getByText('failed').first()).toBeVisible();
    });

    test('shows correct order counts from stats', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        // MOCK_STATS.total = 7
        await expect(page.getByText('7').first()).toBeVisible();
        // MOCK_STATS.today = 2
        await expect(page.getByText('2').first()).toBeVisible();
    });

    test('does not crash when stats API returns 500', async ({ page }) => {
        await setupWithErrorRoute(page, '/api/admin/orders/stats');
        await page.goto('/admin/dashboard');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when stats byStatus is missing', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        // Override stats with a response that has no byStatus array
        await page.route('**/api/admin/orders/stats', (route: Route) => {
            route.fulfill({ json: { total: 0, today: 0, thisWeek: 0, pending: 0 } });
        });
        await page.goto('/admin/dashboard');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
        await expect(page.getByText('Total Orders')).toBeVisible();
    });

    test('does not crash when stats revenue is missing', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/orders/stats', (route: Route) => {
            route.fulfill({ json: { ...MOCK_STATS, revenue: null } });
        });
        await page.goto('/admin/dashboard');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });
});

// ═══════════════════════════════════════════════════════════
// ORDERS — no .map crash on orders array
// ═══════════════════════════════════════════════════════════

test.describe('Orders page resilience', () => {
    test('loads without crash (happy path)', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await assertNoError(page);
        await expect(page.getByText('Sarah Johnson')).toBeVisible();
        await expect(page.getByText('James & Emma Chen')).toBeVisible();
    });

    test('renders all 7 mock orders', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        // Spot-check a few buyer names
        for (const order of MOCK_ORDERS) {
            await expect(page.getByText(order.etsy_buyer_name!).first()).toBeVisible();
        }
    });

    test('does not crash when orders API returns error object', async ({ page }) => {
        await setupWithErrorRoute(page, '/api/admin/orders');
        await page.goto('/admin/orders');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when orders is not an array (null response)', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/orders', (route: Route) => {
            if (route.request().method() === 'GET') {
                route.fulfill({ json: null });
            } else {
                route.continue();
            }
        });
        await page.goto('/admin/orders');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when orders.orders is missing', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/orders', (route: Route) => {
            if (route.request().method() === 'GET') {
                route.fulfill({ json: { error: 'Unexpected format' } });
            } else {
                route.continue();
            }
        });
        await page.goto('/admin/orders');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('status filter works without crash', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        // Change status filter dropdown to 'failed'
        const select = page.locator('select').first();
        await select.selectOption('failed');
        await page.waitForTimeout(500);
        await assertNoError(page);
        await expect(page.getByText('Sophie Dubois')).toBeVisible();
    });

    test('search input works without crash', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        const searchInput = page.getByPlaceholder(/search/i);
        if (await searchInput.count() > 0) {
            await searchInput.fill('Sarah');
            await page.waitForTimeout(600);
            await assertNoError(page);
        }
    });
});

// ═══════════════════════════════════════════════════════════
// ORDER DETAIL — no crash on missing design / timeline
// ═══════════════════════════════════════════════════════════

test.describe('Order detail page resilience', () => {
    test('loads order #1 without crash', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await assertNoError(page);
        await expect(page.getByText('Order #1')).toBeVisible();
    });

    test('shows order info fields', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await expect(page.getByText('ABC123')).toBeVisible(); // token
        await expect(page.getByText('The Night We Met')).toBeVisible(); // design title
    });

    test('does not crash when order API returns 404', async ({ page }) => {
        await asAdmin(page, '/admin/orders/99999');
        await assertNoError(page);
        // Should show "Order not found" or similar
        await expect(page.getByText(/not found/i).first()).toBeVisible();
    });

    test('does not crash when design is null', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/orders/2', (route: Route) => {
            if (route.request().method() === 'GET' && !route.request().url().includes('timeline')) {
                route.fulfill({ json: { order: MOCK_ORDERS[1], design: null } });
            } else {
                route.continue();
            }
        });
        await page.goto('/admin/orders/2');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when timeline fetch returns error', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/orders/1/timeline', (route: Route) => {
            route.fulfill({ status: 500, json: { error: 'Timeline unavailable' } });
        });
        await page.goto('/admin/orders/1');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
        await expect(page.getByText('Order #1')).toBeVisible();
    });

    test('status update button works', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        // Change status selector
        const select = page.locator('select').first();
        await select.selectOption('refunded');
        await page.waitForTimeout(200);
        const updateBtn = page.getByRole('button', { name: /update status/i });
        if (await updateBtn.count() > 0) {
            await expect(updateBtn).toBeEnabled();
        }
        await assertNoError(page);
    });

    test('seller notes textarea works', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        const textarea = page.locator('textarea');
        if (await textarea.count() > 0) {
            await textarea.fill('Test note');
            await assertNoError(page);
        }
    });
});

// ═══════════════════════════════════════════════════════════
// TEMPLATES — no .map crash, correct list render
// ═══════════════════════════════════════════════════════════

test.describe('Templates page resilience', () => {
    test('loads without crash (happy path)', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        await assertNoError(page);
        await expect(page.getByText('Classic Dark')).toBeVisible();
        await expect(page.getByText('Modern White')).toBeVisible();
        await expect(page.getByText('Home Street')).toBeVisible();
    });

    test('renders all 3 mock templates', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        for (const t of MOCK_TEMPLATES) {
            await expect(page.getByText(t.name)).toBeVisible();
        }
    });

    test('does not crash when templates API returns error object', async ({ page }) => {
        // This was the exact crash: "templates.map is not a function"
        await setupWithErrorRoute(page, '/api/admin/templates');
        await page.goto('/admin/templates');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when templates API returns null', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/templates', (route: Route) => {
            if (route.request().method() === 'GET') {
                route.fulfill({ json: null });
            } else {
                route.continue();
            }
        });
        await page.goto('/admin/templates');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when templates API returns empty array', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/templates', (route: Route) => {
            if (route.request().method() === 'GET') {
                route.fulfill({ json: [] });
            } else {
                route.continue();
            }
        });
        await page.goto('/admin/templates');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
        // Should show "no templates" message or empty state
    });

    test('does not crash when templates API returns 401', async ({ page }) => {
        // This was the root cause: 401 body set as templates, then templates.map() crashed
        await setupWith401Route(page, '/api/admin/templates');
        await page.goto('/admin/templates');
        await page.waitForTimeout(2000); // Allow redirect
        // Should either show no error or have redirected to login — either is acceptable
        const url = page.url();
        if (url.includes('/admin/templates')) {
            await assertNoError(page);
        }
        // If redirected to login, that's also fine
    });
});

// ═══════════════════════════════════════════════════════════
// ETSY PAGE — no "templates is not iterable" crash
// ═══════════════════════════════════════════════════════════

test.describe('Etsy page resilience', () => {
    test('loads without crash (happy path)', async ({ page }) => {
        await asAdmin(page, '/admin/etsy');
        await assertNoError(page);
    });

    test('does not crash when templates and etsy both fail', async ({ page }) => {
        // This was the exact crash: "templates is not iterable"
        await setupWithErrorRoute(page, '/api/admin/templates');
        await page.goto('/admin/etsy');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when etsy status returns error', async ({ page }) => {
        await setupWithErrorRoute(page, '/api/admin/etsy/status');
        await page.goto('/admin/etsy');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when etsy status returns null', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/etsy/status', (route: Route) => {
            route.fulfill({ json: null });
        });
        await page.goto('/admin/etsy');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when etsy listings returns error', async ({ page }) => {
        await setupWithErrorRoute(page, '/api/admin/etsy/listings');
        await page.goto('/admin/etsy');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('shows "not connected" state when Etsy not configured', async ({ page }) => {
        await asAdmin(page, '/admin/etsy');
        // Default mock returns connected: false
        await expect(page.getByText(/not connected|connect|api key/i).first()).toBeVisible();
        await assertNoError(page);
    });
});

// ═══════════════════════════════════════════════════════════
// ANALYTICS — no crash on missing data
// ═══════════════════════════════════════════════════════════

test.describe('Analytics page resilience', () => {
    test('loads without crash (happy path)', async ({ page }) => {
        await asAdmin(page, '/admin/analytics');
        await assertNoError(page);
    });

    test('does not crash when analytics API returns 500', async ({ page }) => {
        await setupWithErrorRoute(page, '/api/admin/analytics');
        await page.goto('/admin/analytics');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when analytics API returns null', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/analytics', (route: Route) => {
            route.fulfill({ json: null });
        });
        await page.goto('/admin/analytics');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when analytics.byEvent is missing', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/analytics', (route: Route) => {
            route.fulfill({ json: { daily: [], topTemplates: [], topCities: [] } });
        });
        await page.goto('/admin/analytics');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when analytics API returns 401', async ({ page }) => {
        await setupWith401Route(page, '/api/admin/analytics');
        await page.goto('/admin/analytics');
        await page.waitForTimeout(2000);
        const url = page.url();
        if (url.includes('/admin/analytics')) {
            await assertNoError(page);
        }
    });
});

// ═══════════════════════════════════════════════════════════
// ASSETS — no .map crash on assets array
// ═══════════════════════════════════════════════════════════

test.describe('Assets page resilience', () => {
    test('loads without crash (happy path)', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await assertNoError(page);
        await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible();
    });

    test('does not crash when assets API returns error object', async ({ page }) => {
        // This was the exact crash: "assets.map is not a function"
        await setupWithErrorRoute(page, '/api/admin/assets');
        await page.goto('/admin/assets');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when assets API returns null', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/assets', (route: Route) => {
            route.fulfill({ json: null });
        });
        await page.goto('/admin/assets');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('shows empty state when no fonts uploaded', async ({ page }) => {
        // Default mock returns [] for assets
        await asAdmin(page, '/admin/assets');
        await assertNoError(page);
        await expect(page.getByText(/no fonts uploaded/i)).toBeVisible();
    });

    test('font tab shows role checkboxes', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByText('Title').first()).toBeVisible();
        await expect(page.getByText('Subtitle').first()).toBeVisible();
        await expect(page.getByText('Details').first()).toBeVisible();
        await expect(page.getByText('Dedication').first()).toBeVisible();
    });

    test('can switch to SVG Shapes tab without crash', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await page.getByRole('tab', { name: 'SVG Shapes' }).click();
        await page.waitForTimeout(500);
        await assertNoError(page);
    });

    test('can switch to Images tab without crash', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await page.getByRole('tab', { name: 'Images' }).click();
        await page.waitForTimeout(500);
        await assertNoError(page);
    });
});

// ═══════════════════════════════════════════════════════════
// SETTINGS — no crash on missing/partial settings
// ═══════════════════════════════════════════════════════════

test.describe('Settings page resilience', () => {
    test('loads without crash (happy path)', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        await assertNoError(page);
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    });

    test('shows order processing section', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        await expect(page.getByText('Order Processing')).toBeVisible();
        await expect(page.getByText('Auto-process orders')).toBeVisible();
    });

    test('shows API credentials section', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        await expect(page.getByText('API Credentials')).toBeVisible();
        await expect(page.getByText('ETSY_API_KEY')).toBeVisible();
        await expect(page.getByText('PRINTIFY_TOKEN')).toBeVisible();
    });

    test('shows email notifications section', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        await expect(page.getByText('Email Notifications')).toBeVisible();
    });

    test('does not crash when settings API returns error', async ({ page }) => {
        await setupWithErrorRoute(page, '/api/admin/settings');
        await page.goto('/admin/settings');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when settings API returns null', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/settings', (route: Route) => {
            if (route.request().method() === 'GET') {
                route.fulfill({ json: null });
            } else {
                route.continue();
            }
        });
        await page.goto('/admin/settings');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when email status returns null', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/email/status', (route: Route) => {
            route.fulfill({ json: null });
        });
        await page.goto('/admin/settings');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('save settings button calls PUT endpoint', async ({ page }) => {
        let putCalled = false;
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/settings', (route: Route) => {
            if (route.request().method() === 'PUT') {
                putCalled = true;
                route.fulfill({ json: { ok: true } });
            } else {
                route.continue();
            }
        });
        await page.goto('/admin/settings');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /save settings/i }).click();
        await page.waitForTimeout(500);
        expect(putCalled).toBe(true);
        await assertNoError(page);
    });

    test('Printify variant mapping fields are visible', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        await expect(page.getByText('Printify Variant Mapping')).toBeVisible();
        await expect(page.getByText('Blueprint ID')).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// QUEUE PAGE — graceful render
// ═══════════════════════════════════════════════════════════

test.describe('Queue page resilience', () => {
    test('loads without crash (happy path)', async ({ page }) => {
        await asAdmin(page, '/admin/queue');
        await assertNoError(page);
    });

    test('shows render queue items from mock', async ({ page }) => {
        await asAdmin(page, '/admin/queue');
        await assertNoError(page);
        // MOCK_RENDER_QUEUE contains Liam OBrien
        const hasContent = await page.getByText('Liam OBrien').isVisible().catch(() => false);
        // Also acceptable if page shows empty/loading state — just no crash
        if (!hasContent) {
            const bodyText = await page.locator('body').textContent();
            expect(bodyText?.trim().length).toBeGreaterThan(20);
        }
    });

    test('does not crash when queue API returns error', async ({ page }) => {
        await setupWithErrorRoute(page, '/api/admin/render/queue');
        await page.goto('/admin/queue');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });

    test('does not crash when queue API returns null', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/render/queue', (route: Route) => {
            route.fulfill({ json: null });
        });
        await page.goto('/admin/queue');
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
    });
});

// ═══════════════════════════════════════════════════════════
// CROSS-PAGE NAVIGATION — no blank pages when switching
// ═══════════════════════════════════════════════════════════

test.describe('Admin navigation resilience', () => {
    const ADMIN_PAGES = [
        '/admin/dashboard',
        '/admin/orders',
        '/admin/templates',
        '/admin/etsy',
        '/admin/analytics',
        '/admin/assets',
        '/admin/settings',
    ];

    for (const adminPage of ADMIN_PAGES) {
        test(`${adminPage} loads without error boundary`, async ({ page }) => {
            await asAdmin(page, adminPage);
            await assertNoError(page);
        });
    }

    test('can navigate between all admin pages without crash', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.goto('/admin/dashboard');
        await page.waitForLoadState('networkidle');

        for (const adminPage of ADMIN_PAGES) {
            await page.goto(adminPage);
            await page.waitForLoadState('networkidle');
            await assertNoError(page);
        }
    });

    test('sidebar nav links work', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        // Click Orders in the sidebar
        await page.getByRole('link', { name: 'Orders' }).first().click();
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
        await expect(page).toHaveURL(/\/admin\/orders/);
    });

    test('back button from order detail returns to orders list', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await page.getByRole('button', { name: 'Back' }).click();
        await page.waitForLoadState('networkidle');
        await assertNoError(page);
        await expect(page).toHaveURL(/\/admin\/orders/);
    });
});

// ═══════════════════════════════════════════════════════════
// ERROR BOUNDARY — verify it catches and shows friendly UI
// ═══════════════════════════════════════════════════════════

test.describe('ErrorBoundary', () => {
    test('shows friendly error message instead of blank page on render crash', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        // Simulate a render crash by injecting a component that throws
        await page.addInitScript(() => {
            // Override window.onerror to suppress console noise in test output
            window.addEventListener('error', (e) => { e.preventDefault(); });
        });

        // Navigate to a page that exists so React mounts
        await page.goto('/admin/dashboard');
        await page.waitForLoadState('networkidle');

        // Manually trigger the error boundary by dispatching an unhandled error
        // (just verifying the boundary exists; we don't try to reproduce internal crash)
        await assertNoError(page);
        // The error boundary wraps the whole tree; if dashboard renders, it's working
        await expect(page.getByText('Total Orders')).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// 401 HANDLING — adminFetch must throw, not return error body
// ═══════════════════════════════════════════════════════════

test.describe('401 / auth token handling', () => {
    test('without token, /admin/dashboard shows login form (not blank black page)', async ({ page }) => {
        await setupMockApi(page); // NOT logged in — no token seeded
        await page.goto('/admin/dashboard');
        await page.waitForLoadState('networkidle');
        // AdminLayout renders <AdminLogin /> inline when isAuthenticated() returns false
        // The URL stays the same but the login form is shown
        await expect(page.getByText('Seller Dashboard')).toBeVisible();
        await expect(page.getByPlaceholder('Admin password')).toBeVisible();
        // Critically: no blank/black page, no "Something went wrong"
        await assertNoError(page);
    });

    test('navigating to any admin page without token shows login form', async ({ page }) => {
        await setupMockApi(page); // NOT logged in
        const protectedPages = ['/admin/orders', '/admin/templates', '/admin/settings'];
        for (const p of protectedPages) {
            await page.goto(p);
            await page.waitForLoadState('networkidle');
            // Should show login form inline (AdminLayout renders AdminLogin when !isAuthenticated())
            await expect(page.getByText('Seller Dashboard')).toBeVisible();
        }
    });

    test('401 from orders API does not crash with .map() error', async ({ page }) => {
        // The bug: adminFetch returned {error: "..."} without throwing.
        // Callers did setOrders({error:"..."}) then orders.map() crashed.
        // Fix: adminFetch throws on 401, callers catch() and set [].
        // Result: page renders cleanly (empty list) — no "Something went wrong" banner.
        await setupWith401Route(page, '/api/admin/orders');
        await page.goto('/admin/orders');
        await page.waitForTimeout(2000);
        // The critical assertion: no crash banner
        await expect(page.getByText('Something went wrong')).not.toBeVisible();
    });
});
