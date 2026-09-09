#!/usr/bin/env bash
set -euo pipefail

# Production runtime integrity check.
# Fails if the API relies on parent node_modules, runtime packages are missing,
# the service is unhealthy, or public listing API smoke checks fail.

PROD_HOST="${PROD_HOST:-ubuntu@3.107.34.169}"
APP_DIR="${APP_DIR:-/home/ubuntu/poster-studio}"
SSH_OPTS="${SSH_OPTS:--o ConnectTimeout=30 -o ServerAliveInterval=10}"

ssh $SSH_OPTS "$PROD_HOST" "APP_DIR='$APP_DIR' bash -s" <<'REMOTE'
set -euo pipefail

cd "$APP_DIR"

echo "== App directory =="
pwd

if [[ -d /home/ubuntu/node_modules ]]; then
  echo "FAIL: /home/ubuntu/node_modules exists. Production must not rely on parent dependencies." >&2
  exit 1
fi

if [[ ! -f package.json ]]; then
  echo "FAIL: package.json missing in $APP_DIR" >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "FAIL: node_modules missing in $APP_DIR" >&2
  exit 1
fi

echo
echo "== Runtime package resolution =="
node <<'NODE'
const path = require('path');
const appDir = process.env.APP_DIR;

const required = [
  'bcryptjs',
  'better-sqlite3',
  'cors',
  'dotenv',
  'express',
  'express-rate-limit',
  'helmet',
  'morgan',
  'node-cron',
  'nodemailer',
  'puppeteer',
  'zod',
];

let failed = false;
for (const mod of required) {
  try {
    const resolved = require.resolve(mod, { paths: [appDir] });
    const rel = path.relative(appDir, resolved);
    const ok = !rel.startsWith('..') && !path.isAbsolute(rel);
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${mod} -> ${resolved}`);
    if (!ok) failed = true;
  } catch (err) {
    console.log(`FAIL ${mod} -> ${err.code || err.message}`);
    failed = true;
  }
}

if (failed) process.exit(1);
NODE

echo
echo "== Service =="
systemctl is-active poster-studio-api.service
systemctl show poster-studio-api.service \
  -p ActiveState \
  -p SubState \
  -p Restart \
  -p MemoryMax \
  -p MemorySwapMax \
  --no-pager

echo
echo "== Local API health =="
curl -fsS http://127.0.0.1:3001/api/health
printf '\n'

echo
echo "== Disk/memory =="
df -h /
free -h
REMOTE

echo
echo "== Production listing API audit =="
npm run listings:audit -- --prod-only
