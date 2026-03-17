# Deployment Guide

## VPS Details

- **Provider:** AWS EC2 t3.micro (free tier)
- **Region:** ap-southeast-2 (Sydney)
- **OS:** Ubuntu 24.04 LTS
- **Tailscale IP:** `100.93.10.110`
- **SSH:** `ssh ubuntu@100.93.10.110`
- **Public URL:** Check EC2 console for current public IP (or assign Elastic IP)

## First-Time Setup on VPS

```bash
ssh ubuntu@100.93.10.110

# Install nginx
sudo apt update && sudo apt install -y nginx

# Create web directory
sudo mkdir -p /var/www/poster-studio
sudo chown ubuntu:ubuntu /var/www/poster-studio

# Nginx config
sudo tee /etc/nginx/sites-available/poster-studio > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/poster-studio;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|woff2|png|jpg|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/poster-studio /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## Deploying Updates

From `/home/dev/poster-studio/` on the dev machine:

```bash
npm run build && rsync -avz --delete dist/ ubuntu@100.93.10.110:/var/www/poster-studio/
```

## Checking the Server

```bash
ssh ubuntu@100.93.10.110 "sudo systemctl status nginx && curl -s -o /dev/null -w '%{http_code}' http://localhost/"
```

## Other Services on the VPS

Don't touch these — they belong to the OpenClaw bot:

| Service | Port | Command |
|---------|------|---------|
| CLI Router v5 | 4097 | `systemctl --user restart openclaw-router` |
| OpenClaw Gateway | 18789 | `systemctl --user restart openclaw-gateway` |

The Telegram bot (`@assistant_clauze_bot`) runs on this same VPS. Nginx on port 80 won't conflict.
