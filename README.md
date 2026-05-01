# Poster Studio

A browser-based print-quality poster designer. Create **star map posters** (showing the exact night sky at a date/time/location) or **street map posters** (stylized city maps) — both using the same professional SVG template system with draggable text, custom fonts, and 300 DPI export.

> Agent/operator note: this README contains historical infrastructure notes. For current startup, listing parity, testing, and deployment guardrails, use `docs/AGENT_RUNBOOK.md`.

---

## Live URL

| Access | URL |
|--------|-----|
| **Public (Cloudflare Tunnel)** | Changes on VPS restart — run: `ssh ubuntu@100.93.10.110 "grep trycloudflare /tmp/cloudflared.log | tail -1"` |
| **Direct (requires port 80 open in AWS)** | http://3.26.170.109 |
| **Dev (local)** | http://localhost:5173 |

> **To make the direct URL permanent:** Open AWS console → EC2 → Security Groups → `launch-wizard-3` → Inbound Rules → Add Rule: Type=HTTP, Port=80, Source=0.0.0.0/0. See AWS Security Group Fix section below.

---

## Project Goal

A self-hosted alternative to commercial poster sites (The Night Sky, Artifact Uprising) that lets users design and download print-ready custom posters — free, no subscriptions, no API keys.

- **Star Maps** — "The sky on the night we met" — using real astronomical data
- **Street Maps** — "The city where it all began" — using OpenStreetMap vector tiles

The app runs fully in the browser with no backend. Export is SVG → Canvas → PNG at 300 DPI.

---

## Server

| Field | Value |
|-------|-------|
| Provider | AWS EC2 t3.micro |
| Region | ap-southeast-2 (Sydney) |
| OS | Ubuntu 24.04 LTS |
| Public IP | 3.26.170.109 |
| Tailscale IP | 100.93.10.110 |
| SSH | `ssh ubuntu@100.93.10.110` |
| Web root | `/var/www/poster-studio/` |
| Web server | nginx on port 80 |
| Public tunnel | cloudflared → trycloudflare.com (systemd: `poster-tunnel.service`) |

### Logging into the server
```bash
ssh ubuntu@100.93.10.110
```
SSH key auth only (ed25519). Key is at `~/.ssh/id_ed25519` on the dev machine.

---

## Credentials & Logins

| Service | Login | Notes |
|---------|-------|-------|
| AWS EC2 (server) | SSH key only, no password | `ssh ubuntu@100.93.10.110` |
| AWS Console | Your AWS account | Needed to open port 80 in `launch-wizard-3` security group |
| GitHub | `gh auth login` done | https://github.com/IsleOf/poster-studio |
| Cloudflare | None — anonymous quick tunnels | URL changes on service restart |
| Nominatim (geocoding) | No API key | Free public API, ~1 req/sec limit |
| OpenFreeMap (map tiles) | No API key | `tiles.openfreemap.org` |
| d3-celestial (star data) | No API key | Raw GitHub JSON CDN |

**No paid services or API keys required.**

---

## Development

```bash
cd /home/dev/poster-studio
npm run api        # API server at http://localhost:3001
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Production build → dist/
```

The Vite server proxies `/api` and `/auth` to `http://localhost:3001`. If listings/templates are missing locally, make sure `npm run api` is running.

## Deploying Updates

```bash
cd /home/dev/poster-studio
npm run build && rsync -avz --delete dist/ ubuntu@100.93.10.110:/var/www/poster-studio/
```

---

## Features

### Star Map Mode
- Real astronomical data from d3-celestial (GitHub CDN, no key)
- Input: location + date + time → exact star positions as SVG
- Circle or heart shape mask
- Constellations, grid lines, glow effect toggles

### Street Map Mode
- City search (Nominatim — type any city, no API key)
- MapLibre GL JS renders offscreen → captured as canvas image
- Injected into SVG template as background
- 8 color presets: Midnight, Classic, Forest, Ocean, Rose Gold, Blueprint, Sepia, Neon

### Shared SVG Template (both modes)
- Drag-to-reposition all text elements
- Title / Subtitle / Details / Dedication with independent fonts
- 40+ fonts (Playfair Display, Cinzel, Great Vibes, Sacramento, Orbitron, Montserrat, etc.)
- Frame with adjustable inset and width
- Divider line
- Print sizes: 8×10" to 24×36"
- Export: 300 DPI PNG

---

## Architecture

```
Browser
  ├─ VectorStarMap.tsx      SVG poster (D3 stars OR street map image)
  ├─ StreetMapCapture.tsx   Offscreen MapLibre → canvas → dataURL
  ├─ SidebarControls.tsx    All controls (accordion panels)
  ├─ MainLayout.tsx         Split-pane layout, zoom/pan
  └─ useStore.ts            Zustand state
```

Street map data flow:
1. User picks "Street Map" + searches city
2. StreetMapCapture renders MapLibre offscreen (top: -9999px)
3. On map idle → canvas.toDataURL() → stored as mapBackgroundImage
4. VectorStarMap renders it as SVG image clipped to circle/heart
5. Text, borders, fonts render on top

---

## AWS Security Group Fix (One-Time, 2 Minutes)

1. Go to AWS EC2 Console → ap-southeast-2 region
2. Left menu → Security Groups → click **launch-wizard-3**
3. Inbound rules tab → Edit inbound rules
4. Add rule: Type=HTTP, Port=80, Source=0.0.0.0/0
5. Add rule: Type=HTTP, Port=80, Source=::/0 (IPv6)
6. Save rules

After this, http://3.26.170.109 works permanently without the tunnel.

---

## Server Commands

```bash
# Check services
sudo systemctl status nginx poster-tunnel

# Get current tunnel URL
grep trycloudflare /tmp/cloudflared.log | tail -1

# Restart tunnel (URL will change)
sudo systemctl restart poster-tunnel
```
