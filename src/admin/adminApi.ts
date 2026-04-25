// Admin API client with auth headers

const API_URL = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
    return localStorage.getItem('admin_token');
}

export function setToken(token: string): void {
    localStorage.setItem('admin_token', token);
}

export function clearToken(): void {
    localStorage.removeItem('admin_token');
}

export function isAuthenticated(): boolean {
    const token = getToken();
    if (!token) return false;
    // Check if token is expired (simple JWT decode)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp > Date.now() / 1000;
    } catch {
        return false;
    }
}

async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (res.status === 401) {
        clearToken();
        window.location.replace('/admin/login');
        throw new Error('Session expired. Please log in again.');
    }
    return res;
}

// Exported JSON-returning variant — fetches, checks ok, and parses JSON.
// Throws an Error with the server's error message on non-2xx responses.
export async function adminFetchJson(path: string, options: RequestInit = {}): Promise<any> {
    const res = await adminFetch(path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
}

// Auth
export async function login(password: string) {
    const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
    }
    const data = await res.json();
    setToken(data.token);
    return data;
}

// Templates
export async function getTemplates() {
    const res = await adminFetch('/api/admin/templates');
    return res.json();
}

export async function getTemplate(id: string) {
    const res = await adminFetch(`/api/admin/templates/${id}`);
    return res.json();
}

export async function publishToEtsy(templateId: string, listing: object) {
    const res = await adminFetch(`/api/admin/templates/${templateId}/publish-etsy`, {
        method: 'POST',
        body: JSON.stringify(listing),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Etsy publish failed (${res.status})`);
    return data;
}

export async function createTemplate(data: Record<string, unknown>) {
    const res = await adminFetch('/api/admin/templates', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateTemplate(id: string, data: Record<string, unknown>) {
    const res = await adminFetch(`/api/admin/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function saveTemplateSettings(id: string, settings: Record<string, unknown>) {
    return adminFetchJson(`/api/admin/templates/${id}/settings`, {
        method: 'PUT',
        body: JSON.stringify({ settings }),
    });
}

export async function getTemplateFulfillmentOptions(id: string) {
    return adminFetchJson(`/api/admin/templates/${id}/fulfillment-options`);
}

export async function updateTemplateFulfillmentOptions(id: string, options: object[]) {
    return adminFetchJson(`/api/admin/templates/${id}/fulfillment-options`, {
        method: 'PUT',
        body: JSON.stringify({ options }),
    });
}

export async function syncToSiblings(id: string) {
    return adminFetchJson(`/api/admin/templates/${id}/sync-to-siblings`, { method: 'POST' });
}

export async function deleteTemplate(id: string) {
    const res = await adminFetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
    return res.json();
}

// Orders
export async function getOrders(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await adminFetch(`/api/admin/orders?${qs}`);
    return res.json();
}

export async function getOrderStats(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await adminFetch(`/api/admin/orders/stats${qs ? `?${qs}` : ''}`);
    return res.json();
}

export async function getOrder(id: number) {
    const res = await adminFetch(`/api/admin/orders/${id}`);
    return res.json();
}

export async function updateOrderStatus(id: number, status: string) {
    const res = await adminFetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
    return res.json();
}

export async function fulfillOrder(id: number) {
    const res = await adminFetch(`/api/admin/orders/${id}/fulfill`, { method: 'POST' });
    return res.json();
}

export async function updateOrderNotes(id: number, notes: string) {
    const res = await adminFetch(`/api/admin/orders/${id}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
    });
    return res.json();
}

export async function bulkUpdateOrderStatus(ids: number[], status: string) {
    return Promise.all(ids.map(id => updateOrderStatus(id, status)));
}

// Settings
export async function getSettings() {
    const res = await adminFetch('/api/admin/settings');
    return res.json();
}

export async function updateSettings(data: Record<string, unknown>) {
    const res = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return res.json();
}

// Etsy
export async function getEtsyStatus() {
    const res = await adminFetch('/api/admin/etsy/status');
    return res.json();
}

export async function getEtsyListings() {
    const res = await adminFetch('/api/admin/etsy/listings');
    return res.json();
}

export async function linkEtsyListing(listing_id: string, template_id: string) {
    const res = await adminFetch('/api/admin/etsy/link', {
        method: 'POST',
        body: JSON.stringify({ listing_id, template_id }),
    });
    return res.json();
}

export async function syncEtsyOrders() {
    const res = await adminFetch('/api/admin/etsy/sync', { method: 'POST' });
    return res.json();
}

// Assets
export async function getAssets(type?: string) {
    const qs = type ? `?type=${type}` : '';
    const res = await adminFetch(`/api/admin/assets${qs}`);
    return res.json();
}

export async function uploadAsset(data: { type: string; name: string; filename: string; data: string; roles?: string[] }) {
    const res = await adminFetch('/api/admin/assets/upload', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteAsset(id: string) {
    const res = await adminFetch(`/api/admin/assets/${id}`, { method: 'DELETE' });
    return res.json();
}

// Etsy receipts
export async function getEtsyReceipts() {
    const res = await adminFetch('/api/admin/etsy/receipts');
    return res.json();
}

// Render queue
export async function getRenderQueue() {
    const res = await adminFetch('/api/admin/render/queue');
    return res.json();
}

export async function cancelRenderJob(id: number) {
    const res = await adminFetch(`/api/admin/render/${id}/cancel`, { method: 'POST' });
    return res.json();
}

export async function retriggerRenderJob(id: number) {
    const res = await adminFetch(`/api/admin/render/${id}/retrigger`, { method: 'POST' });
    return res.json();
}

// Fulfillment providers
export async function getFulfillmentProviders(size?: string, productType?: string) {
    const qs = new URLSearchParams();
    if (size) qs.set('size', size);
    if (productType) qs.set('product_type', productType);
    return adminFetchJson(`/api/admin/fulfillment-providers?${qs}`);
}

export async function updateFulfillmentProviders(rows: object[]) {
    return adminFetchJson('/api/admin/fulfillment-providers', {
        method: 'PUT',
        body: JSON.stringify(rows),
    });
}

export async function patchFulfillmentProvider(id: number, data: object) {
    return adminFetchJson(`/api/admin/fulfillment-providers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

// Design Groups
export async function getDesignGroups() {
    return adminFetchJson('/api/admin/design-groups');
}

export async function createDesignGroup(data: object) {
    return adminFetchJson('/api/admin/design-groups', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function deleteDesignGroup(id: string) {
    return adminFetchJson(`/api/admin/design-groups/${id}`, { method: 'DELETE' });
}

// Listings
export async function getListings() {
    return adminFetchJson('/api/admin/listings');
}

export async function getListing(id: number) {
    return adminFetchJson(`/api/admin/listings/${id}`);
}

export async function createListing(data: object) {
    return adminFetchJson('/api/admin/listings', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// Email
export async function getEmailStatus() {
    const res = await adminFetch('/api/admin/email/status');
    return res.json();
}

export async function testEmail() {
    const res = await adminFetch('/api/admin/email/test', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Email test failed');
    return data;
}
