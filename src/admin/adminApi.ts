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
        window.location.href = '/admin/login';
    }
    return res;
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

export async function getOrderStats() {
    const res = await adminFetch('/api/admin/orders/stats');
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

export async function uploadAsset(data: { type: string; name: string; filename: string; data: string }) {
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
