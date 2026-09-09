/**
 * Mock API fixtures — intercept all /api/ calls with realistic canned responses.
 * Call setupMockApi(page) at the start of any test to avoid hitting the real server.
 */
import { Page, Route } from '@playwright/test';

// ── Shared mock data ─────────────────────────────────────────────────────────

export const MOCK_JWT =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    btoa(JSON.stringify({ role: 'admin', sub: 'admin', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 }))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_') +
    '.mock_signature';

export const MOCK_TEMPLATES = [
    {
        id: 'classic-dark', name: 'Classic Dark', description: 'Dark navy star map',
        is_active: 1, etsy_listing_id: null, etsy_listing_url: null,
        thumbnail_path: null, created_at: 1700000000, updated_at: 1700000000,
        settings_json: JSON.stringify({ posterType: 'starmap', maskShape: 'circle', posterColor: '#0a1628', textColor: '#c8b888' }),
        settings: { posterType: 'starmap', maskShape: 'circle', posterColor: '#0a1628', textColor: '#c8b888' },
        etsyListing: null,
    },
    {
        id: 'modern-white', name: 'Modern White', description: 'White background star map',
        is_active: 1, etsy_listing_id: '1234567890', etsy_listing_url: 'https://www.etsy.com/listing/1234567890',
        thumbnail_path: null, created_at: 1700000100, updated_at: 1700000100,
        settings_json: JSON.stringify({ posterType: 'starmap', maskShape: 'circle', posterColor: '#ffffff', textColor: '#1a202c' }),
        settings: { posterType: 'starmap', maskShape: 'circle', posterColor: '#ffffff', textColor: '#1a202c' },
        etsyListing: { title: 'Custom Star Map Poster', description: 'Beautiful star map', price: '25.00', currency: 'USD', quantity: '999', type: 'download', tags: ['star map', 'custom poster'], taxonomy_id: '66', shipping_profile_id: '', return_policy_id: '', materials: ['Digital Print'] },
    },
    {
        id: 'home-street', name: 'Home Street', description: 'House-shaped colored map',
        is_active: 1, etsy_listing_id: null, etsy_listing_url: null,
        thumbnail_path: null, created_at: 1700000200, updated_at: 1700000200,
        settings_json: JSON.stringify({ posterType: 'coloredmap', maskShape: 'house', posterColor: '#ffffff', textColor: '#2d3748' }),
        settings: { posterType: 'coloredmap', maskShape: 'house', posterColor: '#ffffff', textColor: '#2d3748' },
        etsyListing: null,
    },
];

export const MOCK_ORDERS = [
    { id: 1, etsy_receipt_id: 'ETSY-10043812', token: 'ABC123', listing_type: 'digital', print_size: '8x10"', status: 'sent', etsy_buyer_name: 'Sarah Johnson', etsy_buyer_email: 'sarah.j@gmail.com', created_at: Math.floor(Date.now() / 1000) - 86400 * 6, fulfilled_at: Math.floor(Date.now() / 1000) - 86400 * 6 + 3600, revisions_used: 0, seller_notes: '' },
    { id: 2, etsy_receipt_id: 'ETSY-10043956', token: 'DEF456', listing_type: 'print', print_size: '11x14"', status: 'fulfilled', etsy_buyer_name: 'James & Emma Chen', etsy_buyer_email: 'jchen@icloud.com', created_at: Math.floor(Date.now() / 1000) - 86400 * 4, fulfilled_at: Math.floor(Date.now() / 1000) - 86400 * 3, revisions_used: 0, tracking_number: 'AUS123456789' },
    { id: 3, etsy_receipt_id: 'ETSY-10044102', token: 'GHI789', listing_type: 'digital', print_size: '8x10"', status: 'rendered', etsy_buyer_name: 'Liam OBrien', etsy_buyer_email: 'liam.ob@outlook.com', created_at: Math.floor(Date.now() / 1000) - 86400 * 3, fulfilled_at: null, revisions_used: 0 },
    { id: 4, etsy_receipt_id: 'ETSY-10044299', token: 'JKL012', listing_type: 'digital', print_size: '8x10"', status: 'pending', etsy_buyer_name: 'Priya Sharma', etsy_buyer_email: 'priya.s@gmail.com', created_at: Math.floor(Date.now() / 1000) - 86400 * 2, fulfilled_at: null, revisions_used: 0 },
    { id: 5, etsy_receipt_id: 'ETSY-10044413', token: 'MNO345', listing_type: 'print', print_size: '18x24"', status: 'pending_manual', etsy_buyer_name: 'Mark Taylor', etsy_buyer_email: 'mark.t@hotmail.com', created_at: Math.floor(Date.now() / 1000) - 86400 * 1, fulfilled_at: null, revisions_used: 0 },
    { id: 6, etsy_receipt_id: 'ETSY-10044520', token: 'PQR678', listing_type: 'digital', print_size: '8x10"', status: 'failed', etsy_buyer_name: 'Sophie Dubois', etsy_buyer_email: 'sdubois@free.fr', created_at: Math.floor(Date.now() / 1000) - 3600 * 5, fulfilled_at: null, revisions_used: 0 },
    { id: 7, etsy_receipt_id: 'ETSY-10044601', token: 'STU901', listing_type: 'digital', print_size: '11x14"', status: 'rendering', etsy_buyer_name: 'Tom Nguyen', etsy_buyer_email: 'tnguyen@gmail.com', created_at: Math.floor(Date.now() / 1000) - 3600 * 2, fulfilled_at: null, revisions_used: 0 },
];

export const MOCK_STATS = {
    total: 7,
    today: 2,
    thisWeek: 7,
    pending: 3,
    byStatus: [
        { status: 'sent', count: 1 },
        { status: 'fulfilled', count: 1 },
        { status: 'rendered', count: 1 },
        { status: 'pending', count: 1 },
        { status: 'pending_manual', count: 1 },
        { status: 'failed', count: 1 },
        { status: 'rendering', count: 1 },
    ],
    revenue: {
        totalCents: 17500,
        digitalCents: 7500,
        printCents: 10000,
        weeklyTrend: Array.from({ length: 7 }, (_, i) => ({
            day: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
            orders: [1, 0, 2, 1, 0, 1, 2][i],
        })),
    },
    avgProcessingSeconds: 7200,
    fulfillmentRatePct: 86,
    funnel: {
        designsCreated: 1240,
        ordersPlaced: 95,
        ordersFulfilled: 72,
    },
};

export const MOCK_ANALYTICS = {
    byEvent: [
        { name: 'page_view', count: 1240 },
        { name: 'template_load', count: 380 },
        { name: 'verify_attempt', count: 95 },
        { name: 'verify_success', count: 72 },
        { name: 'share_click', count: 45 },
    ],
    daily: Array.from({ length: 30 }, (_, i) => ({
        day: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
        total: Math.floor(Math.random() * 50) + 10,
    })),
    topTemplates: [
        { templateId: 'classic-dark', count: 180 },
        { templateId: 'modern-white', count: 120 },
        { templateId: 'home-street', count: 80 },
    ],
    topCities: [
        { city: 'Sydney', country: 'Australia', count: 95 },
        { city: 'London', country: 'United Kingdom', count: 82 },
        { city: 'New York', country: 'United States', count: 71 },
        { city: 'Paris', country: 'France', count: 54 },
    ],
    range: '30d',
};

export const MOCK_SETTINGS = {
    auto_process_orders: false,
    max_revisions: 3,
    notify_email: '',
    _etsyApiKey: false,
    _etsyAccessToken: false,
    _etsyShopId: false,
    _printifyToken: false,
};

export const MOCK_SETTINGS_CONNECTED = {
    ...MOCK_SETTINGS,
    _etsyApiKey: true,
    _etsyAccessToken: true,
    _etsyShopId: true,
    _printifyToken: true,
    auto_process_orders: true,
    notify_email: 'hello@themappedmoment.com',
};

export const MOCK_ETSY_STATUS_CONNECTED = {
    connected: true,
    shopId: 'TheMappedMoment',
    shopName: 'The Mapped Moment',
    apiKeySet: true,
    lastPollAt: new Date(Date.now() - 300_000).toISOString(), // 5 min ago
    listingsCount: 12,
    activeListingsCount: 9,
    pendingOrdersCount: 3,
};

export const MOCK_ETSY_LISTINGS = [
    { id: '1234567890', title: 'Custom Star Map Poster — Personalised Night Sky Print', state: 'active', price: { amount: 2500, divisor: 100, currency_code: 'USD' }, quantity: 999, url: 'https://www.etsy.com/listing/1234567890', thumbnail_url: null, views: 1240, num_favorers: 89 },
    { id: '1234567891', title: 'Custom Street Map Poster — Personalised City Map Print', state: 'active', price: { amount: 2900, divisor: 100, currency_code: 'USD' }, quantity: 999, url: 'https://www.etsy.com/listing/1234567891', thumbnail_url: null, views: 850, num_favorers: 62 },
    { id: '1234567892', title: 'Anniversary Map Poster — Heart Shaped Star Map', state: 'active', price: { amount: 3200, divisor: 100, currency_code: 'USD' }, quantity: 999, url: 'https://www.etsy.com/listing/1234567892', thumbnail_url: null, views: 2100, num_favorers: 178 },
    { id: '1234567893', title: 'Custom Colored City Map — Full Colour Street Map Print', state: 'inactive', price: { amount: 3500, divisor: 100, currency_code: 'USD' }, quantity: 999, url: 'https://www.etsy.com/listing/1234567893', thumbnail_url: null, views: 320, num_favorers: 18 },
];

export const MOCK_ETSY_RECEIPTS = [
    { receipt_id: 10043812, status: 'paid', buyer_email: 'sarah.j@gmail.com', buyer_user_id: 101, name: 'Sarah Johnson', total_price: { amount: 2500, divisor: 100, currency_code: 'USD' }, message_from_buyer: 'Sydney, 14 Feb 2022', transactions: [{ listing_id: '1234567890', quantity: 1, price: { amount: 2500, divisor: 100 } }], created_timestamp: Date.now() / 1000 - 86400 * 3 },
    { receipt_id: 10043956, status: 'paid', buyer_email: 'jchen@icloud.com', buyer_user_id: 102, name: 'James Chen', total_price: { amount: 5800, divisor: 100, currency_code: 'USD' }, message_from_buyer: 'Paris, 20 Apr 2021', transactions: [{ listing_id: '1234567891', quantity: 2, price: { amount: 2900, divisor: 100 } }], created_timestamp: Date.now() / 1000 - 86400 * 2 },
    { receipt_id: 10044102, status: 'paid', buyer_email: 'liam.ob@outlook.com', buyer_user_id: 103, name: 'Liam OBrien', total_price: { amount: 3200, divisor: 100, currency_code: 'USD' }, message_from_buyer: 'Wedding - London', transactions: [{ listing_id: '1234567892', quantity: 1, price: { amount: 3200, divisor: 100 } }], created_timestamp: Date.now() / 1000 - 86400 },
];

export const MOCK_PRINTIFY_PRODUCTS = [
    { id: 'prod-001', title: 'Premium Matte Poster', print_provider_id: 99, blueprint_id: 400, variants: [
        { id: 'var-8x10', title: '8×10"', price: 1200, is_enabled: true },
        { id: 'var-11x14', title: '11×14"', price: 1600, is_enabled: true },
        { id: 'var-18x24', title: '18×24"', price: 2400, is_enabled: true },
        { id: 'var-24x36', title: '24×36"', price: 3200, is_enabled: true },
    ]},
];

export const MOCK_PRINTIFY_ORDER = {
    id: 'pf-order-001',
    external_id: 'ETSY-10043956',
    status: 'pending',
    line_items: [{ product_id: 'prod-001', variant_id: 'var-11x14', quantity: 1 }],
    shipping_method: 1,
    created_at: new Date().toISOString(),
};

export const MOCK_RENDER_QUEUE = [
    { id: 3, token: 'GHI789', status: 'rendering', started_at: new Date(Date.now() - 90_000).toISOString(), buyer_name: 'Liam OBrien', print_size: '8x10"' },
    { id: 4, token: 'JKL012', status: 'pending', started_at: null, buyer_name: 'Priya Sharma', print_size: '8x10"' },
    { id: 5, token: 'MNO345', status: 'pending_manual', started_at: null, buyer_name: 'Mark Taylor', print_size: '18x24"' },
];

export const MOCK_ORDER_TIMELINES: Record<number, Array<{
    id: number;
    label: string;
    detail: string;
    actor: string;
    created_at: number;
}>> = {
    1: [
        {
            id: 101,
            label: 'Order verified',
            detail: 'Etsy receipt validated and design token linked.',
            actor: 'system',
            created_at: Math.floor(Date.now() / 1000) - 86400 * 6,
        },
        {
            id: 102,
            label: 'Poster delivered',
            detail: 'Signed download link emailed to the buyer.',
            actor: 'system',
            created_at: Math.floor(Date.now() / 1000) - 86400 * 6 + 3600,
        },
    ],
    6: [
        {
            id: 601,
            label: 'Render failed',
            detail: 'Renderer returned an invalid image and the job was marked failed.',
            actor: 'system',
            created_at: Math.floor(Date.now() / 1000) - 3600 * 4,
        },
    ],
};

// ── Route handler ─────────────────────────────────────────────────────────────

async function handleRoute(route: Route) {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    // ── Auth ────────────────────────────────────────────────────────────────
    if (path === '/api/admin/login' && method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        if (body.password === 'testpass123') {
            return route.fulfill({ json: { token: MOCK_JWT, expiresIn: 86400 } });
        }
        return route.fulfill({ status: 401, json: { error: 'Invalid password' } });
    }

    // ── Health ───────────────────────────────────────────────────────────────
    if (path === '/api/health') {
        return route.fulfill({ json: { ok: true, ts: Date.now() } });
    }

    // ── Public templates ─────────────────────────────────────────────────────
    if (path === '/api/templates' && method === 'GET') {
        return route.fulfill({ json: MOCK_TEMPLATES.filter(t => t.is_active) });
    }
    const templatePublicMatch = path.match(/^\/api\/templates\/(.+)$/);
    if (templatePublicMatch && method === 'GET' && !path.includes('/admin/')) {
        const t = MOCK_TEMPLATES.find(t => t.id === templatePublicMatch[1]);
        if (!t) return route.fulfill({ status: 404, json: { error: 'Not found' } });
        return route.fulfill({ json: { ...t, settings: t.settings } });
    }

    // ── Admin templates ──────────────────────────────────────────────────────
    if (path === '/api/admin/templates' && method === 'GET') {
        return route.fulfill({ json: MOCK_TEMPLATES });
    }
    const templateAdminMatch = path.match(/^\/api\/admin\/templates\/([^/]+)$/);
    if (templateAdminMatch && method === 'GET') {
        const t = MOCK_TEMPLATES.find(t => t.id === templateAdminMatch[1]);
        if (!t) return route.fulfill({ status: 404, json: { error: 'Not found' } });
        return route.fulfill({ json: t });
    }
    if (templateAdminMatch && method === 'PUT') {
        return route.fulfill({ json: { ...MOCK_TEMPLATES[0], id: templateAdminMatch[1] } });
    }
    if (path === '/api/admin/templates' && method === 'POST') {
        return route.fulfill({ status: 201, json: { id: 'new-template', name: 'New Template', is_active: 1, settings: {} } });
    }
    if (templateAdminMatch && method === 'DELETE') {
        return route.fulfill({ json: { ok: true } });
    }
    const publishMatch = path.match(/^\/api\/admin\/templates\/([^/]+)\/publish-etsy$/);
    if (publishMatch && method === 'POST') {
        return route.fulfill({ json: { ok: true, listing_id: '9876543210', url: 'https://www.etsy.com/listing/9876543210' } });
    }

    // ── Admin orders ─────────────────────────────────────────────────────────
    if (path === '/api/admin/orders/stats') {
        return route.fulfill({ json: MOCK_STATS });
    }
    if (path === '/api/admin/orders' && method === 'GET') {
        const status = url.searchParams.get('status');
        const search = url.searchParams.get('search') || '';
        let orders = MOCK_ORDERS;
        if (status && status !== 'all') orders = orders.filter(o => o.status === status);
        if (search) orders = orders.filter(o =>
            o.token.includes(search) || o.etsy_buyer_name?.toLowerCase().includes(search.toLowerCase()) || o.etsy_receipt_id?.includes(search)
        );
        return route.fulfill({ json: { orders, total: orders.length } });
    }
    const orderMatch = path.match(/^\/api\/admin\/orders\/(\d+)$/);
    if (orderMatch && method === 'GET') {
        const o = MOCK_ORDERS.find(o => o.id === parseInt(orderMatch[1]));
        if (!o) return route.fulfill({ status: 404, json: { error: 'Not found' } });
        return route.fulfill({ json: { order: o, design: { posterType: 'starmap', maskShape: 'circle', location: 'Sydney, Australia', customText: { title: 'The Night We Met' } } } });
    }
    const orderTimelineMatch = path.match(/^\/api\/admin\/orders\/(\d+)\/timeline$/);
    if (orderTimelineMatch && method === 'GET') {
        const orderId = parseInt(orderTimelineMatch[1], 10);
        return route.fulfill({ json: { events: MOCK_ORDER_TIMELINES[orderId] || [] } });
    }
    const orderStatusMatch = path.match(/^\/api\/admin\/orders\/(\d+)\/status$/);
    if (orderStatusMatch && method === 'PATCH') {
        return route.fulfill({ json: { ok: true } });
    }
    const orderFulfillMatch = path.match(/^\/api\/admin\/orders\/(\d+)\/fulfill$/);
    if (orderFulfillMatch && method === 'POST') {
        return route.fulfill({ json: { ok: true, message: 'Order fulfilled' } });
    }

    // ── Admin settings ───────────────────────────────────────────────────────
    if (path === '/api/admin/settings' && method === 'GET') {
        return route.fulfill({ json: MOCK_SETTINGS });
    }
    if (path === '/api/admin/settings' && method === 'PUT') {
        return route.fulfill({ json: MOCK_SETTINGS });
    }

    // ── Admin Etsy ───────────────────────────────────────────────────────────
    if (path === '/api/admin/etsy/status') {
        return route.fulfill({ json: { connected: false, shopId: null, apiKeySet: false, lastPollAt: null } });
    }
    if (path === '/api/admin/etsy/sync' && method === 'POST') {
        return route.fulfill({ json: { ok: true, processed: 3, imported: 3, skipped: 0, message: '3 new orders imported' } });
    }
    if (path === '/api/admin/etsy/listings') {
        return route.fulfill({ json: { listings: MOCK_ETSY_LISTINGS } });
    }
    if (path === '/api/admin/etsy/link' && method === 'POST') {
        return route.fulfill({ json: { ok: true } });
    }
    if (path === '/api/admin/etsy/receipts' && method === 'GET') {
        return route.fulfill({ json: { receipts: MOCK_ETSY_RECEIPTS, count: MOCK_ETSY_RECEIPTS.length } });
    }
    if (path === '/api/admin/etsy/shop') {
        return route.fulfill({ json: MOCK_ETSY_STATUS_CONNECTED });
    }
    const etsyListingMatch = path.match(/^\/api\/admin\/etsy\/listings\/(.+)\/update$/);
    if (etsyListingMatch && method === 'PUT') {
        return route.fulfill({ json: { ok: true, listing_id: etsyListingMatch[1] } });
    }

    // ── Admin fulfillment providers ───────────────────────────────────────────
    if (path === '/api/admin/fulfillment-providers' && method === 'GET') {
        return route.fulfill({ json: [
            { id: 1, provider: 'printful', product_type: 'poster_unframed', size: '18x24', print_cost: 10.00, ship_cost_us: 4.49, ship_cost_intl: 4.59, has_api: 1, notes: null },
            { id: 2, provider: 'printify', product_type: 'poster_unframed', size: '18x24', print_cost: 8.00, ship_cost_us: 4.00, ship_cost_intl: null, has_api: 1, notes: null },
            { id: 3, provider: 'shortrunposters', product_type: 'poster_unframed', size: '18x24', print_cost: 5.00, ship_cost_us: 5.00, ship_cost_intl: null, has_api: 0, notes: null },
        ] });
    }
    if (path === '/api/admin/fulfillment-providers' && method === 'PUT') {
        return route.fulfill({ json: { ok: true } });
    }

    // ── Admin Printify ────────────────────────────────────────────────────────
    if (path === '/api/admin/printify/products' && method === 'GET') {
        return route.fulfill({ json: { products: MOCK_PRINTIFY_PRODUCTS } });
    }
    if (path === '/api/admin/printify/orders' && method === 'POST') {
        return route.fulfill({ json: { ok: true, order: MOCK_PRINTIFY_ORDER } });
    }
    const printifyOrderMatch = path.match(/^\/api\/admin\/printify\/orders\/(.+)$/);
    if (printifyOrderMatch && method === 'GET') {
        return route.fulfill({ json: { ...MOCK_PRINTIFY_ORDER, id: printifyOrderMatch[1], status: 'in-production' } });
    }
    if (printifyOrderMatch && method === 'DELETE') {
        return route.fulfill({ json: { ok: true } });
    }
    if (path === '/api/admin/printify/shipping-rates' && method === 'POST') {
        return route.fulfill({ json: { rates: [
            { id: 1, title: 'Standard Shipping (7-14 days)', rate: 599 },
            { id: 2, title: 'Express Shipping (3-5 days)', rate: 1299 },
        ] } });
    }

    // ── Admin render queue ───────────────────────────────────────────────────
    if (path === '/api/admin/render/queue' && method === 'GET') {
        return route.fulfill({ json: { queue: MOCK_RENDER_QUEUE, active: 1, pending: 2 } });
    }
    const renderJobMatch = path.match(/^\/api\/admin\/render\/(\d+)\/cancel$/);
    if (renderJobMatch && method === 'POST') {
        return route.fulfill({ json: { ok: true } });
    }
    const renderRetriggerMatch = path.match(/^\/api\/admin\/render\/(\d+)\/retrigger$/);
    if (renderRetriggerMatch && method === 'POST') {
        return route.fulfill({ json: { ok: true, status: 'rendering' } });
    }

    // ── Admin webhooks ───────────────────────────────────────────────────────
    if (path === '/api/webhooks/etsy' && method === 'POST') {
        return route.fulfill({ json: { ok: true } });
    }
    if (path === '/api/webhooks/printify' && method === 'POST') {
        return route.fulfill({ json: { ok: true } });
    }

    // ── Admin assets ─────────────────────────────────────────────────────────
    if (path === '/api/admin/assets') {
        return route.fulfill({ json: [] });
    }
    if (path === '/api/admin/assets/upload' && method === 'POST') {
        return route.fulfill({ json: { id: 'asset-1', name: 'Test Font', type: 'font', filename: 'test.woff2' } });
    }

    // ── Admin fulfillment options ───────────────────────────────────────────
    const foptionsMatch = path.match(/^\/api\/admin\/listings\/(\d+)\/fulfillment-options$/);
    if (foptionsMatch && method === 'GET') {
        return route.fulfill({ json: [
            { id: 1, listing_id: parseInt(foptionsMatch[1]), option_type: 'digital', is_enabled: 1, label: 'Digital Download', provider: null, price_cents: 1299, position: 0, production_days_min: 0, production_days_max: 0, shipping_days_us_min: 0, shipping_days_us_max: 0, shipping_days_intl_min: 0, shipping_days_intl_max: 0, etsy_variation_value: null },
            { id: 2, listing_id: parseInt(foptionsMatch[1]), option_type: 'print_unframed', is_enabled: 0, label: 'Printed Poster', provider: 'printful', price_cents: 2999, position: 1, production_days_min: 2, production_days_max: 5, shipping_days_us_min: 3, shipping_days_us_max: 7, shipping_days_intl_min: 7, shipping_days_intl_max: 21, etsy_variation_value: null },
            { id: 3, listing_id: parseInt(foptionsMatch[1]), option_type: 'print_framed', is_enabled: 0, label: 'Framed Poster', provider: 'printops', price_cents: 5999, position: 2, production_days_min: 3, production_days_max: 7, shipping_days_us_min: 3, shipping_days_us_max: 7, shipping_days_intl_min: 7, shipping_days_intl_max: 21, etsy_variation_value: null },
            { id: 4, listing_id: parseInt(foptionsMatch[1]), option_type: 'canvas', is_enabled: 0, label: 'Canvas Print', provider: 'prodigi', price_cents: 4999, position: 3, production_days_min: 3, production_days_max: 7, shipping_days_us_min: 3, shipping_days_us_max: 7, shipping_days_intl_min: 7, shipping_days_intl_max: 21, etsy_variation_value: null },
        ] });
    }
    if (foptionsMatch && method === 'PUT') {
        const body = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({ json: body.options || [] });
    }
    const etsySyncMatch = path.match(/^\/api\/admin\/listings\/(\d+)\/sync-etsy-inventory$/);
    if (etsySyncMatch && method === 'POST') {
        return route.fulfill({ json: { ok: true, products: 2 } });
    }

    // ── Template fulfillment options (per-size) ───────────────────────────────
    const tplFoptionsMatch = path.match(/^\/api\/admin\/templates\/([^/]+)\/fulfillment-options$/);
    if (tplFoptionsMatch && method === 'GET') {
        return route.fulfill({ json: [
            { id: 1, template_id: tplFoptionsMatch[1], option_type: 'digital',        is_enabled: 1, label: 'Digital Download', provider: null,       price_cents: 1299, position: 0, production_days_min: 0, production_days_max: 0, shipping_days_us_min: 0, shipping_days_us_max: 0, shipping_days_intl_min: 0,  shipping_days_intl_max: 0  },
            { id: 2, template_id: tplFoptionsMatch[1], option_type: 'print_unframed', is_enabled: 0, label: 'Printed Poster',   provider: 'printful', price_cents: 2999, position: 1, production_days_min: 2, production_days_max: 5, shipping_days_us_min: 3, shipping_days_us_max: 7, shipping_days_intl_min: 7,  shipping_days_intl_max: 21 },
            { id: 3, template_id: tplFoptionsMatch[1], option_type: 'print_framed',   is_enabled: 0, label: 'Framed Poster',   provider: 'printops', price_cents: 5999, position: 2, production_days_min: 3, production_days_max: 7, shipping_days_us_min: 3, shipping_days_us_max: 7, shipping_days_intl_min: 7,  shipping_days_intl_max: 21 },
            { id: 4, template_id: tplFoptionsMatch[1], option_type: 'canvas',         is_enabled: 0, label: 'Canvas Print',    provider: 'prodigi',  price_cents: 4999, position: 3, production_days_min: 3, production_days_max: 7, shipping_days_us_min: 3, shipping_days_us_max: 7, shipping_days_intl_min: 7,  shipping_days_intl_max: 21 },
        ] });
    }
    if (tplFoptionsMatch && method === 'PUT') {
        return route.fulfill({ json: { ok: true } });
    }

    // ── Order notes ───────────────────────────────────────────────────────────
    const notesMatch = path.match(/^\/api\/admin\/orders\/(\d+)\/notes$/);
    if (notesMatch && method === 'PATCH') {
        return route.fulfill({ json: { ...MOCK_ORDERS[0], seller_notes: JSON.parse(route.request().postData() || '{}').notes } });
    }

    // ── Order status polling ──────────────────────────────────────────────────
    if (path === '/api/order-status') {
        return route.fulfill({ json: { status: 'sent', listingType: 'digital' } });
    }

    // ── Admin analytics ─────────────────────────────────────────────────────
    if (path === '/api/admin/analytics') {
        return route.fulfill({ json: MOCK_ANALYTICS });
    }

    // ── Admin email ─────────────────────────────────────────────────────────
    if (path === '/api/admin/email/status') {
        return route.fulfill({ json: { enabled: true, configured: true, from: 'shop@themappedmoment.com', sellerEmail: 'hello@themappedmoment.com' } });
    }
    if (path === '/api/admin/email/test' && method === 'POST') {
        return route.fulfill({ json: { ok: true, message: 'Test email sent' } });
    }

    // ── Admin orders CSV export ─────────────────────────────────────────────
    if (path === '/api/admin/orders/export') {
        return route.fulfill({
            headers: { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="orders.csv"' },
            body: 'id,etsy_receipt_id,status,buyer_name\n1,ETSY-10043812,sent,Sarah Johnson',
        });
    }

    // ── Admin orders bulk action ────────────────────────────────────────────
    if (path === '/api/admin/orders/bulk' && method === 'POST') {
        return route.fulfill({ json: { ok: true, affected: 2 } });
    }

    // ── Admin order retry / fulfill ─────────────────────────────────────────
    const retryMatch = path.match(/^\/api\/admin\/orders\/(\d+)\/retry$/);
    if (retryMatch && method === 'POST') {
        return route.fulfill({ json: { ok: true, message: 'Retried' } });
    }

    // ── Events ingestion ────────────────────────────────────────────────────
    if (path === '/api/events' && method === 'POST') {
        return route.fulfill({ json: { ok: true } });
    }

    // ── Public fonts ──────────────────────────────────────────────────────────
    if (path === '/api/assets/fonts') {
        return route.fulfill({ json: [] });
    }

    // ── Save/verify design ───────────────────────────────────────────────────
    if (path === '/api/save-design' && method === 'POST') {
        return route.fulfill({ json: { token: 'TST999', ok: true } });
    }
    if (path.match(/^\/api\/design\//)) {
        return route.fulfill({ json: { token: 'TST999', state_json: '{}', created_at: Date.now() } });
    }
    // Paid download delivery — return a 1×1 binary blob so silentDownload() succeeds in tests
    if (path.startsWith('/api/download-file/')) {
        const tiny = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
        return route.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.from(tiny) });
    }
    if (path === '/api/verify-order' && method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        if (body.etsyOrderId === '9999999999') {
            return route.fulfill({ json: { listingType: 'digital', downloadUrl: '/api/download-file/1?t=mock&exp=9999999999&sig=mocksig', buyerName: 'Test Buyer', revisionsUsed: 0, revisionsRemaining: 3 } });
        }
        if (body.etsyOrderId === '8888888888') {
            return route.fulfill({ json: { listingType: 'print', printifyOrderId: 'PF-123456', buyerName: 'Print Buyer' } });
        }
        if (body.etsyOrderId === '7777777777') {
            return route.fulfill({ json: { status: 'rendering', listingType: 'digital' } });
        }
        return route.fulfill({ status: 404, json: { error: 'Order not found' } });
    }

    // Pass through everything else (static assets, fonts, etc.)
    return route.continue();
}

/**
 * Call in beforeEach to intercept all /api/ calls with mock responses.
 * Also pre-seeds the admin JWT in localStorage so admin pages don't redirect to login.
 */
export async function setupMockApi(page: Page, options: { loggedIn?: boolean } = { loggedIn: false }) {
    await page.route('**/api/**', handleRoute);

    // Always suppress the WelcomeModal (first-visit onboarding) during tests
    // so it never blocks clicks on the designer page.
    await page.addInitScript(() => {
        localStorage.setItem('poster_studio_welcomed', '1');
    });

    if (options.loggedIn) {
        await page.addInitScript((token) => {
            localStorage.setItem('admin_token', token);
        }, MOCK_JWT);
    }
}

/**
 * Seed admin token into localStorage (call after page.goto).
 */
export async function seedAdminToken(page: Page) {
    await page.evaluate((token) => {
        localStorage.setItem('admin_token', token);
    }, MOCK_JWT);
}
