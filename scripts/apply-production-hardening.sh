#!/usr/bin/env bash
set -euo pipefail

# Apply low-risk production guardrails:
# - systemd restart/resource limits for the API
# - journald retention caps
# - hourly temp-file/disk/memory maintenance

PROD_HOST="${PROD_HOST:-ubuntu@3.107.34.169}"
SSH_OPTS="${SSH_OPTS:--o ConnectTimeout=30 -o ServerAliveInterval=10}"

ssh $SSH_OPTS "$PROD_HOST" 'bash -s' <<'REMOTE'
set -euo pipefail

sudo mkdir -p \
  /etc/systemd/system/poster-studio-api.service.d \
  /etc/systemd/journald.conf.d \
  /usr/local/bin

sudo tee /etc/systemd/system/poster-studio-api.service.d/override.conf >/dev/null <<'EOF'
[Service]
Restart=always
RestartSec=5s
MemoryMax=750M
MemorySwapMax=1500M
EOF

sudo tee /etc/systemd/journald.conf.d/poster-studio.conf >/dev/null <<'EOF'
[Journal]
SystemMaxUse=300M
RuntimeMaxUse=100M
MaxRetentionSec=14day
EOF

sudo tee /usr/local/bin/poster-studio-maintenance.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

log() {
  logger -t poster-studio-maintenance "$*"
  printf "%s\n" "$*"
}

ROOT_USE=$(df --output=pcent / | tail -n 1 | tr -dc "0-9")
ROOT_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
MEM_AVAIL=$(free -m | awk '/^Mem:/ {print $7}')

log "root=${ROOT_USE}% avail=${ROOT_AVAIL} mem_available=${MEM_AVAIL}MiB"

# Only remove temporary render scratch files. Do not delete paid order renders
# until object-storage retention exists.
find /tmp -maxdepth 1 -mindepth 1 -type d -name "poster-studio-*" -mtime +1 -print -exec rm -rf {} + 2>/dev/null || true
find /tmp -maxdepth 1 -type f \( -name "poster-studio-*.png" -o -name "poster-studio-*.tmp" \) -mtime +1 -print -delete 2>/dev/null || true

# Keep local npm logs from growing.
find /home/ubuntu/.npm/_logs -type f -mtime +14 -print -delete 2>/dev/null || true

if [ "$ROOT_USE" -ge 90 ]; then
  log "WARNING root disk usage is ${ROOT_USE}%"
fi

if [ "$MEM_AVAIL" -le 150 ]; then
  log "WARNING available memory is ${MEM_AVAIL}MiB"
fi
EOF
sudo chmod 0755 /usr/local/bin/poster-studio-maintenance.sh

sudo tee /etc/cron.d/poster-studio-maintenance >/dev/null <<'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
15 * * * * root /usr/local/bin/poster-studio-maintenance.sh >/dev/null 2>&1
EOF

sudo systemctl daemon-reload
sudo systemctl restart systemd-journald
sudo systemctl restart poster-studio-api.service

sleep 3
systemctl is-active poster-studio-api.service
systemctl show poster-studio-api.service -p Restart -p MemoryMax -p MemorySwapMax --no-pager
/usr/local/bin/poster-studio-maintenance.sh
REMOTE
