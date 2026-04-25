/**
 * Admin dashboard tests — login, orders, templates, Etsy, assets, settings.
 * All API calls are mocked via setupMockApi.
 */
import { test, expect, Page } from '@playwright/test';
import { setupMockApi, seedAdminToken, MOCK_JWT } from './fixtures/mockApi';

// Helper: navigate to admin already logged in
async function asAdmin(page: Page, path = '/admin/dashboard') {
    await setupMockApi(page, { loggedIn: true });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
}

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════

test.describe('Admin Login', () => {
    test('shows login form at /admin', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin');
        await expect(page.getByText('Seller Dashboard')).toBeVisible();
        await expect(page.getByPlaceholder('Admin password')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('wrong password shows error', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.getByPlaceholder('Admin password').fill('wrongpassword');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page.getByText('Invalid password')).toBeVisible();
    });

    test('correct password redirects to dashboard', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.getByPlaceholder('Admin password').fill('testpass123');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page).toHaveURL(/\/admin\/dashboard/);
        await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    });

    test('token stored in localStorage after login', async ({ page }) => {
        await setupMockApi(page);
        await page.goto('/admin/login');
        await page.getByPlaceholder('Admin password').fill('testpass123');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await page.waitForURL(/\/admin\/dashboard/);
        const token = await page.evaluate(() => localStorage.getItem('admin_token'));
        expect(token).toBeTruthy();
        expect(token).toContain('eyJ');
    });

    test('already logged in redirects away from login', async ({ page }) => {
        await setupMockApi(page, { loggedIn: true });
        await page.goto('/admin/login');
        await expect(page).toHaveURL(/\/admin\/dashboard/);
    });

    test('logout clears token', async ({ page }) => {
        await asAdmin(page);
        await page.getByRole('button', { name: 'Logout' }).click();
        const token = await page.evaluate(() => localStorage.getItem('admin_token'));
        expect(token).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════

test.describe('Dashboard', () => {
    test('shows stat cards with order counts', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await expect(page.getByText('Total Orders')).toBeVisible();
        await expect(page.getByText('7').first()).toBeVisible();  // total (may appear twice)
        await expect(page.getByText('Today')).toBeVisible();
        await expect(page.getByText('This Week')).toBeVisible();
        await expect(page.getByText('Pending Action')).toBeVisible();
        await expect(page.getByText('3').first()).toBeVisible();  // pending
    });

    test('shows status breakdown badges', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        // Target badge elements specifically, not dropdown options
        await expect(page.locator('.chakra-badge').filter({ hasText: 'sent' })).toBeVisible();
        await expect(page.locator('.chakra-badge').filter({ hasText: 'pending' }).first()).toBeVisible();
        await expect(page.locator('.chakra-badge').filter({ hasText: 'failed' })).toBeVisible();
    });

    test('clicking Total Orders navigates to orders page', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        await page.getByText('Total Orders').click();
        await expect(page).toHaveURL(/\/admin\/orders/);
    });

    test('nav sidebar links all visible', async ({ page }) => {
        await asAdmin(page, '/admin/dashboard');
        for (const label of ['Dashboard', 'Orders', 'Listings', 'Etsy', 'Assets', 'Settings']) {
            await expect(page.getByRole('link', { name: label })).toBeVisible();
        }
    });
});

// ═══════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════

test.describe('Orders page', () => {
    test('shows all 7 mock orders', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await expect(page.getByText('7 total')).toBeVisible();
        await expect(page.getByText('Sarah Johnson')).toBeVisible();
        await expect(page.getByText('Tom Nguyen')).toBeVisible();
    });

    test('order rows show correct status badges', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        // Target badges in the table rows, not the filter dropdown options
        const badges = page.locator('table .chakra-badge');
        await expect(badges.filter({ hasText: 'sent' })).toBeVisible();
        await expect(badges.filter({ hasText: 'fulfilled' })).toBeVisible();
        await expect(badges.filter({ hasText: 'pending_manual' })).toBeVisible();
        await expect(badges.filter({ hasText: 'failed' })).toBeVisible();
    });

    test('filter by status = pending shows only pending orders', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.getByRole('combobox').selectOption('pending');
        await expect(page.getByText('Priya Sharma')).toBeVisible();
        await expect(page.getByText('Sarah Johnson')).not.toBeVisible();
    });

    test('search by buyer name filters results', async ({ page }) => {
        await asAdmin(page, '/admin/orders?search=Sarah');
        await expect(page.getByText('Sarah Johnson')).toBeVisible();
        await expect(page.getByText('Tom Nguyen')).not.toBeVisible();
    });

    test('clicking order row opens order detail', async ({ page }) => {
        await asAdmin(page, '/admin/orders');
        await page.getByText('Sarah Johnson').click();
        await expect(page).toHaveURL(/\/admin\/orders\/1/);
        await expect(page.getByText('Order #1')).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// ORDER DETAIL
// ═══════════════════════════════════════════════════════════

test.describe('Order detail page', () => {
    test('shows order info fields', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await expect(page.getByText('ETSY-10043812')).toBeVisible();
        await expect(page.getByText('ABC123')).toBeVisible();
        await expect(page.getByText('Sarah Johnson')).toBeVisible();
        await expect(page.getByText('digital')).toBeVisible();
    });

    test('shows design info section', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await expect(page.getByText('Design Info')).toBeVisible();
        await expect(page.getByText('The Night We Met')).toBeVisible();
        await expect(page.getByText('starmap')).toBeVisible();
    });

    test('status dropdown is populated', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        const select = page.locator('select').first();
        await expect(select).toBeVisible();
        // Current status is 'sent'
        await expect(select).toHaveValue('sent');
    });

    test('Fulfill Now button triggers fulfill API call', async ({ page }) => {
        await asAdmin(page, '/admin/orders/3');
        let fulfillCalled = false;
        await page.route('**/api/admin/orders/3/fulfill', route => {
            fulfillCalled = true;
            route.fulfill({ json: { ok: true } });
        });
        const fulfillBtn = page.getByRole('button', { name: 'Fulfill Now' });
        await expect(fulfillBtn).toBeEnabled();
        await fulfillBtn.click();
        await page.waitForTimeout(300);
        expect(fulfillCalled).toBe(true);
    });

    test('Update Status button is disabled when status unchanged', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        const updateBtn = page.getByRole('button', { name: 'Update Status' });
        await expect(updateBtn).toBeDisabled();
    });

    test('Back button navigates to orders list', async ({ page }) => {
        await asAdmin(page, '/admin/orders/1');
        await page.getByRole('button', { name: 'Back' }).click();
        await expect(page).toHaveURL(/\/admin\/orders$/);
    });
});

// ═══════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════

test.describe('Templates page', () => {
    test('lists all 3 mock templates', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        await expect(page.getByText('Classic Dark')).toBeVisible();
        await expect(page.getByText('Modern White')).toBeVisible();
        await expect(page.getByText('Home Street')).toBeVisible();
    });

    test('shows mode and shape badges', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        await expect(page.getByText('starmap').first()).toBeVisible();
        await expect(page.getByText('coloredmap')).toBeVisible();
        await expect(page.getByText('circle').first()).toBeVisible();
        await expect(page.getByText('house')).toBeVisible();
    });

    test('shows linked Etsy listing ID for modern-white', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        await expect(page.getByText('1234567890')).toBeVisible();
    });

    test('template URL links are displayed', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        await expect(page.getByText('/t/classic-dark')).toBeVisible();
        await expect(page.getByText('/t/modern-white')).toBeVisible();
    });

    test('New Template button navigates to editor', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        await page.getByRole('button', { name: 'New Template' }).click();
        await expect(page).toHaveURL(/\/admin\/templates\/new/);
    });

    test('Edit button navigates to template editor', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        await page.getByRole('button', { name: 'Edit' }).first().click();
        await expect(page).toHaveURL(/\/admin\/templates\/.+\/edit/);
    });

    test('Delete shows confirmation and calls API', async ({ page }) => {
        await asAdmin(page, '/admin/templates');
        let deleteCalled = false;
        await page.route('**/api/admin/templates/classic-dark', route => {
            if (route.request().method() === 'DELETE') {
                deleteCalled = true;
                route.fulfill({ json: { ok: true } });
            } else {
                route.continue();
            }
        });
        page.on('dialog', d => d.accept());
        await page.getByRole('button', { name: 'Delete' }).first().click();
        await page.waitForTimeout(200);
        expect(deleteCalled).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════
// TEMPLATE EDITOR
// ═══════════════════════════════════════════════════════════

test.describe('Template editor', () => {
    test('loads existing template data', async ({ page }) => {
        await asAdmin(page, '/admin/templates/classic-dark/edit');
        // The name input should be populated with the template name
        await expect(page.locator('input[value="Classic Dark"]')).toBeVisible();
    });

    test('shows Template Details and Etsy Listing tabs', async ({ page }) => {
        await asAdmin(page, '/admin/templates/classic-dark/edit');
        await expect(page.getByRole('tab', { name: 'Template Details' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Etsy Listing' })).toBeVisible();
    });

    test('Etsy Listing tab shows all listing fields', async ({ page }) => {
        await asAdmin(page, '/admin/templates/modern-white/edit');
        await page.getByRole('tab', { name: 'Etsy Listing' }).click();
        await expect(page.getByText('Listing Basics')).toBeVisible();
        await expect(page.getByText('Pricing & Stock')).toBeVisible();
        await expect(page.getByText(/Tags/).first()).toBeVisible();
        await expect(page.getByText('Publish to Etsy')).toBeVisible();
    });

    test('modern-white shows Live on Etsy badge', async ({ page }) => {
        await asAdmin(page, '/admin/templates/modern-white/edit');
        await page.getByRole('tab', { name: 'Etsy Listing' }).click();
        await expect(page.getByText('Live on Etsy')).toBeVisible();
        await expect(page.getByText('1234567890')).toBeVisible();
    });

    test('classic-dark shows Publish to Etsy button (new)', async ({ page }) => {
        await asAdmin(page, '/admin/templates/classic-dark/edit');
        await page.getByRole('tab', { name: 'Etsy Listing' }).click();
        await expect(page.getByRole('button', { name: 'Publish to Etsy' })).toBeVisible();
        await expect(page.getByText('Live on Etsy')).not.toBeVisible();
    });

    test('clicking Publish to Etsy calls publish API and shows success', async ({ page }) => {
        // Register route interceptor BEFORE navigating
        let publishCalled = false;
        await setupMockApi(page, { loggedIn: true });
        await page.route('**/api/admin/templates/classic-dark/publish-etsy', route => {
            publishCalled = true;
            route.fulfill({ json: { ok: true, listing_id: '9876543210', url: 'https://www.etsy.com/listing/9876543210' } });
        });

        await page.goto('/admin/templates/classic-dark/edit');
        await page.waitForLoadState('networkidle');
        await page.getByRole('tab', { name: 'Etsy Listing' }).click();

        // Target the title input by its actual placeholder text (from TemplateEditorPage)
        const titleInput = page.getByPlaceholder('Custom Star Map Poster — Personalized Night Sky Print');
        await titleInput.waitFor({ state: 'visible', timeout: 8000 });
        await titleInput.fill('Custom Star Map Poster');
        const priceInput = page.locator('input[placeholder="25.00"]');
        if (await priceInput.count() > 0) await priceInput.fill('29.99');

        await page.getByRole('button', { name: 'Publish to Etsy' }).click();
        await expect(page.getByText(/Listing created on Etsy/)).toBeVisible({ timeout: 8000 });
        expect(publishCalled).toBe(true);
    });

    test('adding and removing tags', async ({ page }) => {
        await asAdmin(page, '/admin/templates/classic-dark/edit');
        await page.getByRole('tab', { name: 'Etsy Listing' }).click();
        const tagInput = page.getByPlaceholder('add tag...');
        await tagInput.waitFor({ state: 'visible', timeout: 8000 });
        await tagInput.fill('star map');
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await expect(page.getByText('star map', { exact: true })).toBeVisible();
        // Close button for Tag component
        const closeBtn = page.locator('.chakra-tag__close-btn, [aria-label="close"]').first();
        if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await expect(page.getByText('star map')).not.toBeVisible();
        }
    });

    test('Save button calls update API for existing template', async ({ page }) => {
        await asAdmin(page, '/admin/templates/classic-dark/edit');
        let saveCalled = false;
        await page.route('**/api/admin/templates/classic-dark', route => {
            if (route.request().method() === 'PUT') {
                saveCalled = true;
                route.fulfill({ json: { id: 'classic-dark', name: 'Classic Dark', settings: {} } });
            } else { route.continue(); }
        });
        await page.getByRole('button', { name: 'Save' }).click();
        await page.waitForTimeout(300);
        expect(saveCalled).toBe(true);
        await expect(page.getByText('Saved!')).toBeVisible();
    });

    test('new template form has slug input', async ({ page }) => {
        await asAdmin(page, '/admin/templates/new');
        await expect(page.getByPlaceholder('classic-dark-starmap')).toBeVisible();
        await expect(page.getByText('/t/your-id')).toBeVisible();
    });

    test('slug auto-cleans to lowercase-hyphen', async ({ page }) => {
        await asAdmin(page, '/admin/templates/new');
        const slugInput = page.getByPlaceholder('classic-dark-starmap');
        await slugInput.fill('My New Template!');
        await expect(slugInput).toHaveValue('my-new-template-');
    });
});

// ═══════════════════════════════════════════════════════════
// ETSY PAGE
// ═══════════════════════════════════════════════════════════

test.describe('Etsy page', () => {
    test('shows disconnected status when no credentials', async ({ page }) => {
        await asAdmin(page, '/admin/etsy');
        await expect(page.getByText('Not Connected', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('ETSY_ACCESS_TOKEN')).toBeVisible();
    });

    test('shows Sync Now button', async ({ page }) => {
        await asAdmin(page, '/admin/etsy');
        const syncBtn = page.getByRole('button', { name: 'Sync Orders Now' });
        await expect(syncBtn).toBeVisible();
        await expect(syncBtn).toBeDisabled(); // disabled when not connected
    });

    test('shows currently linked templates section', async ({ page }) => {
        await asAdmin(page, '/admin/etsy');
        await expect(page.getByText('Currently linked')).toBeVisible();
        await expect(page.getByText('Modern White')).toBeVisible();
        await expect(page.getByText(/1234567890/)).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════════════════════

test.describe('Settings page', () => {
    test('shows auto-process toggle defaulting to OFF', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        await expect(page.getByText('Auto-process orders')).toBeVisible();
        await expect(page.getByText('OFF')).toBeVisible();
    });

    test('shows max revisions field', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        // NumberInput renders as an input — value '3' from mock
        await expect(page.locator('input[type="number"]').first()).toHaveValue('3');
    });

    test('shows credential status rows', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        await expect(page.getByText('ETSY_API_KEY')).toBeVisible();
        await expect(page.getByText('PRINTIFY_TOKEN')).toBeVisible();
        // 'missing' badges rendered as chakra-badge elements
        await expect(page.locator('.chakra-badge').filter({ hasText: 'missing' }).first()).toBeVisible();
    });

    test('Save Settings calls update API', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        let saveCalled = false;
        await page.route('**/api/admin/settings', route => {
            if (route.request().method() === 'PUT') {
                saveCalled = true;
                route.fulfill({ json: {} });
            } else { route.continue(); }
        });
        await page.getByRole('button', { name: 'Save Settings' }).click();
        await page.waitForTimeout(300);
        expect(saveCalled).toBe(true);
        await expect(page.getByText('Settings saved!')).toBeVisible();
    });

    test('toggling auto-process updates badge', async ({ page }) => {
        await asAdmin(page, '/admin/settings');
        // Chakra Switch: click the track element with force to bypass pointer-events
        const switchTrack = page.locator('.chakra-switch__track').first();
        await switchTrack.click({ force: true });
        await page.waitForTimeout(300);
        await expect(page.locator('.chakra-badge').filter({ hasText: /^ON$/ })).toBeVisible({ timeout: 3000 });
    });
});

// ═══════════════════════════════════════════════════════════
// ASSETS PAGE
// ═══════════════════════════════════════════════════════════

test.describe('Assets page', () => {
    test('shows three tabs: Fonts, SVG Shapes, Images', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByRole('tab', { name: 'Fonts' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'SVG Shapes' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Images' })).toBeVisible();
    });

    test('empty state shown when no assets', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        await expect(page.getByText(/No fonts uploaded yet/i)).toBeVisible();
    });

    test('shows upload form with name and file inputs', async ({ page }) => {
        await asAdmin(page, '/admin/assets');
        // Multiple tabs have upload inputs; first visible one is on the active Fonts tab
        await expect(page.getByPlaceholder('e.g. Bebas Neue').first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Upload' }).first()).toBeVisible();
    });
});
