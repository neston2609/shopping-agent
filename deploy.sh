#!/bin/bash
set -e

echo "==> Pulling latest code..."
git pull origin main

echo "==> Installing dependencies..."
npm ci --omit=dev

echo "==> Building..."
npm run build

echo "==> Restarting PM2..."
pm2 restart ecosystem.config.js --update-env

echo "==> Done."
pm2 status
