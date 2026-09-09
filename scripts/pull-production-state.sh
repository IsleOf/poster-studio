#!/usr/bin/env bash
set -euo pipefail

# Pull production DB/template thumbnails into local development state.
# Production is currently the source of truth for manually edited templates.

PROD_HOST="${PROD_HOST:-ubuntu@3.107.34.169}"
PROD_DB="${PROD_DB:-/home/ubuntu/poster-studio/server/data/db.sqlite}"
PROD_DESIGNS="${PROD_DESIGNS:-/var/www/poster-studio/designs/}"
LOCAL_DB="${LOCAL_DB:-server/data/db.sqlite}"
LOCAL_DESIGNS="${LOCAL_DESIGNS:-public/designs/}"
BACKUP_ROOT="${BACKUP_ROOT:-backups/production-sync}"
SSH_OPTS="${SSH_OPTS:--o ConnectTimeout=30 -o ServerAliveInterval=10}"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="$BACKUP_ROOT/$timestamp"

mkdir -p "$backup_dir" "$(dirname "$LOCAL_DB")" "$LOCAL_DESIGNS"

if [[ -f "$LOCAL_DB" ]]; then
  cp -a "$LOCAL_DB" "$backup_dir/db.local-before.sqlite"
fi

if [[ -d "$LOCAL_DESIGNS" ]]; then
  rsync -a "$LOCAL_DESIGNS" "$backup_dir/public-designs-before/"
fi

scp $SSH_OPTS "$PROD_HOST:$PROD_DB" "$backup_dir/db.production.sqlite"
rsync -avz -e "ssh $SSH_OPTS" "$PROD_HOST:$PROD_DESIGNS" "$LOCAL_DESIGNS"
cp "$backup_dir/db.production.sqlite" "$LOCAL_DB"

printf '%s\n' "$timestamp" > "$BACKUP_ROOT/LATEST"

echo "Production state pulled."
echo "Backup: $backup_dir"
echo "Local DB: $LOCAL_DB"
echo "Local designs: $LOCAL_DESIGNS"
