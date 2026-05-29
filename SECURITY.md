# Security Audit — Poster Studio

Audited: 2026-05-29 | Scope: full codebase | Severity: CRITICAL / HIGH / MEDIUM / LOW

---

## CRITICAL

### SEC-001 — Weak production secrets (ALL THREE)

**File:** `server/.env` (production)
**Issue:** Three secrets have default/weak values in production:

| Secret | Current value | Risk |
|--------|--------------|------|
| `ADMIN_PASSWORD` | `testpass123` | Trivial brute-force → admin takeover |
| `JWT_SECRET` | `dev-secret-key-change-in-production` | Arbitrary admin JWT can be forged |
| `DOWNLOAD_SECRET` | `replace-with-random-secret-string` | Customer download links can be forged |

**Fix — run on server:**
```bash
# Generate strong secrets
NEW_JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NEW_DL=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NEW_PASS=$(node -e "require('bcryptjs').hash('CHOOSE_A_STRONG_PASSWORD', 12).then(console.log)")

# Update .env
ssh ubuntu@3.107.34.169
cd /home/ubuntu/poster-studio/server
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_JWT}|" .env
sed -i "s|^DOWNLOAD_SECRET=.*|DOWNLOAD_SECRET=${NEW_DL}|" .env
sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${NEW_PASS}|" .env
sudo systemctl restart poster-studio-api
```

---

### SEC-002 — Unauthenticated file write with path traversal

**File:** `server/index.js` line 126-134
**Issue:** The `/api/save-render` endpoint has no authentication and no filename sanitization:

```js
app.post('/api/save-render', (req, res) => {
    const { imageData, filename } = req.body;
    const filepath = path.join(outputsDir, filename);  // ← UNSANITIZED
    fs.writeFileSync(filepath, buffer);
```

`path.join` resolves `../` segments. An attacker can write arbitrary files anywhere the
Node process has write access (e.g., `../../server/.env`, cron jobs, nginx config).

**Fix:**
```js
// In server/index.js — replace the /api/save-render route:
app.post('/api/save-render', publicWriteLimiter, (req, res) => {
    const { imageData, filename } = req.body;
    if (!imageData || !filename) return res.status(400).json({ error: 'Missing fields' });
    // Sanitize filename — alphanumeric + dot + dash only, no path separators
    const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!safeFilename || safeFilename.startsWith('.')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filepath = path.join(outputsDir, safeFilename);
    fs.writeFileSync(filepath, buffer);
    res.json({ success: true, path: filepath });
});
```

Or simply remove the endpoint — it is described as "dev local disk save" and is not used
by any production path.

---

## HIGH

### SEC-003 — CSS injection via font name in dynamic stylesheet

**File:** `server/routes/admin-assets.js` line 141
**Issue:** `font.name` (stored in DB by admin) is interpolated directly into CSS output:

```js
css += `@font-face {\n  font-family: '${font.name}';\n  ...`;
```

A malicious font name like `x'; } * { display: none } @font-face { font-family: 'y`
would break out of the font-family value and inject arbitrary CSS rules. The
`/api/assets/fonts.css` endpoint is **public** (no auth required). While only admins can
upload fonts, any compromised admin session or insider threat can affect all customers.

**Fix:**
```js
// Sanitize font.name — only allow safe CSS identifier characters
const safeName = font.name.replace(/['"\\<>&]/g, '');
css += `@font-face {\n  font-family: '${safeName}';\n  ...`;
```

---

### SEC-004 — Webhook endpoints accept unsigned requests

**File:** `server/routes/webhooks.js` lines 18-27, 74-83
**Issue:** Both Prodigi and Printify webhook handlers only verify signatures **if** the
secret env var is set. When `PRODIGI_WEBHOOK_SECRET` / `PRINTIFY_WEBHOOK_SECRET` are absent
(current production state), any HTTP client can POST to:

- `POST /api/webhooks/prodigi` → mark orders as shipped, trigger shipping emails
- `POST /api/webhooks/printify` → same

An attacker knowing the webhook URL can spam fake `order.dispatched` events, triggering
shipping emails to customers for orders that haven't shipped.

**Fix:** Reject requests when secret is not configured (fail-secure):
```js
const secret = process.env.PRODIGI_WEBHOOK_SECRET;
if (!secret) {
    console.error('[Webhook] PRODIGI_WEBHOOK_SECRET not set — rejecting webhook');
    return res.status(503).json({ error: 'Webhook not configured' });
}
```

---

### SEC-005 — CORS allows all origins when env var is absent

**File:** `server/index.js` line 55
**Issue:**
```js
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : true; // true = allow all (dev fallback)
```

If `CORS_ORIGIN` is not set in production `.env`, all origins are allowed. Since the server
exposes JWT-authenticated admin endpoints via CORS, a malicious site could make
cross-origin requests with admin credentials stored in the browser.

**Fix:** Default to the known production origin, not `true`:
```js
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['https://themappedmoment.com']; // safe default
```

---

### SEC-006 — Legacy download endpoint bypasses HMAC verification

**File:** `server/routes/download.js`
**Issue:** `GET /api/download/:token` serves the rendered PNG to anyone who knows a valid
design token, checking only that `orders.status = 'sent'`. This bypasses the time-limited
HMAC signature system in `/api/download-file/:orderId`. Design tokens are shared publicly
(they appear in `/d/:token` share URLs), so anyone with the share URL can download the
paid render for free.

**Fix:** Remove or restrict this endpoint:
```js
// Either delete server/routes/download.js and remove its import from index.js,
// OR add requireAdmin guard:
router.get('/download/:token', requireAdmin, (req, res) => { ... });
```

The `/api/download-file/:orderId` (HMAC-signed, time-limited) is the correct customer-facing
endpoint. The legacy one should be removed.

---

## MEDIUM

### SEC-007 — Admin panel has no rate limiting beyond login

**File:** `server/index.js`, `server/routes/admin-orders.js`, etc.
**Issue:** Only `/api/admin/login` has rate limiting (5 req/15min). All other admin endpoints
(`/api/admin/orders`, `/api/admin/simulate-order`, `/api/admin/render/...`) have no rate
limits. A valid admin JWT allows unlimited writes to the DB and render queue.

**Impact:** Compromised admin JWT can flood the render queue, exhaust disk space, or spam
customers with emails.

**Fix:** Apply a reasonable admin rate limit (e.g., 200/min) globally:
```js
const adminLimiter = rateLimit({ windowMs: 60_000, max: 200, skip: (req) => !req.path.startsWith('/api/admin') });
app.use(adminLimiter);
```

---

### SEC-008 — `render_path` stored in DB without canonicalization

**File:** `server/routes/verify.js` line 308, `server/routes/download.js` line 30
**Issue:**
```js
res.sendFile(path.resolve(order.render_path));
```

`order.render_path` is set by server code, so ordinarily safe. However, if the SQLite DB
were compromised (e.g., via the simulation endpoint or a hypothetical SQL injection),
a crafted `render_path` value like `/etc/passwd` or `../../server/.env` would cause the
server to serve arbitrary files.

**Fix:** Validate that the resolved path stays within the renders directory:
```js
const resolvedPath = path.resolve(order.render_path);
const rendersDir = path.resolve(process.env.RENDERS_DIR || './data/renders');
if (!resolvedPath.startsWith(rendersDir + path.sep)) {
    return res.status(403).json({ error: 'Invalid file path' });
}
res.sendFile(resolvedPath);
```

---

### SEC-009 — Express body limit is 50 MB on all routes

**File:** `server/index.js` line 107
**Issue:**
```js
app.use(express.json({ limit: '50mb' }));
```

Public endpoints like `/api/save-design` and `/api/email-capture` accept up to 50 MB bodies.
On a 1 GB RAM server, a few concurrent large requests can exhaust memory and crash the process.

**Fix:** Apply tight limits to public endpoints, keep 50 MB only for admin upload:
```js
app.use('/api/admin/assets/upload', express.json({ limit: '50mb' }));
app.use(express.json({ limit: '1mb' })); // default for all other routes
```

---

### SEC-010 — JWT has no revocation mechanism

**File:** `server/middleware/auth.js`
**Issue:** JWTs are valid for 24 hours with no server-side revocation. A stolen admin JWT
cannot be invalidated without changing `JWT_SECRET` (which invalidates all active sessions).

**Fix (minimal):** Add a `jti` (JWT ID) claim and keep a DB set of revoked JTIs:
```js
// On logout or security event:
db.prepare('INSERT INTO revoked_tokens (jti, exp) VALUES (?, ?)').run(payload.jti, payload.exp);
// In verifyToken():
if (db.prepare('SELECT 1 FROM revoked_tokens WHERE jti = ?').get(payload.jti)) return null;
```

---

## LOW

### SEC-011 — Health check leaks server timestamp

**File:** `server/index.js` line 140
```js
res.json({ ok: true, ts: Date.now() });
```
Minor: reveals server's system clock, useful for timing attacks against HMAC.
**Fix:** Remove `ts` or replace with a static `"ok"`.

---

### SEC-012 — SVG shape content not sanitized

**File:** `server/routes/admin-assets.js` lines 115-117
The uploaded SVG content is stored and served directly. An SVG can contain `<script>` tags
or `javascript:` hrefs which execute in some browser contexts. Currently only admins can
upload SVGs, but defense-in-depth recommends sanitizing:

**Fix:** Strip `<script>`, `<iframe>`, on* attributes, and `javascript:` from SVG uploads.
Consider using the `dompurify` npm package in a Node environment.

---

### SEC-013 — `savedDesign.render_path` exposed to Puppeteer renderer

**File:** `src/components/PosterRenderPage.tsx`
The `/render` page is publicly accessible (no auth). Anyone can navigate to
`/render?token=ANYTOKEN` and trigger the React app to load that design. This is
intentional for the Puppeteer render flow, but means designs can be viewed
unauthenticated in the headless browser context. Not a critical issue since design
state is already retrievable via `/api/design/:token`.

---

## Summary Table

| ID | Severity | Component | Status |
|----|----------|-----------|--------|
| SEC-001 | **CRITICAL** | server/.env weak secrets | ⚠️ Needs immediate fix on server |
| SEC-002 | **CRITICAL** | /api/save-render path traversal | ⚠️ Remove or patch in index.js |
| SEC-003 | **HIGH** | CSS injection in fonts.css | ⚠️ Sanitize font.name |
| SEC-004 | **HIGH** | Unsigned webhook acceptance | ⚠️ Set secrets or fail-secure |
| SEC-005 | **HIGH** | CORS wildcard fallback | ⚠️ Default to known origin |
| SEC-006 | **HIGH** | Legacy download bypasses HMAC | ⚠️ Remove download.js |
| SEC-007 | MEDIUM | No admin rate limiting | Add global admin limiter |
| SEC-008 | MEDIUM | render_path not canonicalized | Add path containment check |
| SEC-009 | MEDIUM | 50 MB body on public routes | Reduce to 1 MB for public |
| SEC-010 | MEDIUM | No JWT revocation | Add revoked_tokens table |
| SEC-011 | LOW | Health check leaks timestamp | Remove ts field |
| SEC-012 | LOW | SVG not sanitized on upload | Strip script tags |
| SEC-013 | LOW | /render publicly accessible | Acceptable — design state already public |
