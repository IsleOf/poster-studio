#!/usr/bin/env bash
set -euo pipefail

# Read-only production health snapshot for capacity/debug handoff.

PROD_HOST="${PROD_HOST:-ubuntu@3.107.34.169}"
SSH_OPTS="${SSH_OPTS:--o ConnectTimeout=30 -o ServerAliveInterval=10}"

ssh $SSH_OPTS "$PROD_HOST" 'bash -s' <<'REMOTE'
set -euo pipefail

echo "== Host =="
hostname
date -Is

echo
echo "== Disk =="
df -h /

echo
echo "== Memory =="
free -h

echo
echo "== API service =="
systemctl status --no-pager poster-studio-api.service || true

echo
echo "== Journal =="
journalctl --disk-usage || true

echo
echo "== Largest known app/user paths =="
du -sh \
  /home/ubuntu/poster-studio/server/data \
  /home/ubuntu/poster-studio/outputs \
  /var/www/poster-studio/designs \
  /var/www/poster-studio/assets \
  /home/ubuntu/.local \
  /home/ubuntu/.cache \
  /home/ubuntu/.cache/whisper \
  /home/ubuntu/.cache/puppeteer \
  /home/ubuntu/.cache/ms-playwright \
  /home/ubuntu/.npm \
  /home/ubuntu/.npm-global \
  /home/ubuntu/node_modules \
  2>/dev/null | sort -h || true

echo
echo "== Poster Studio DB =="
cd /home/ubuntu/poster-studio
node <<'NODE'
const fs = require('fs');
const dbPath = '/home/ubuntu/poster-studio/server/data/db.sqlite';

if (!fs.existsSync(dbPath)) {
  console.log(`missing: ${dbPath}`);
  process.exit(0);
}

const Database = require('better-sqlite3');
const db = new Database(dbPath, { readonly: true });

function count(table) {
  try {
    return db.prepare(`select count(*) as count from ${table}`).get().count;
  } catch {
    return 'n/a';
  }
}

const snapshot = {
  dbBytes: fs.statSync(dbPath).size,
  templates: count('templates'),
  listings: count('listings'),
  designs: count('designs'),
  orders: count('orders'),
};

try {
  snapshot.renderQueue = db
    .prepare('select status, count(*) as count from render_queue group by status order by status')
    .all();
} catch {
  snapshot.renderQueue = 'n/a';
}

console.log(JSON.stringify(snapshot, null, 2));
db.close();
NODE
REMOTE
