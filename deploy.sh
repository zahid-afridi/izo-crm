#!/bin/bash
set -e

IMAGE="ghcr.io/zahid-afridi/izo-crm:latest"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "📁 Working directory: $APP_DIR"
cd "$APP_DIR"

# Check .env exists
if [ ! -f ".env" ]; then
  echo "❌ .env file not found in $APP_DIR"
  echo "   Create it first: nano $APP_DIR/.env"
  exit 1
fi

echo "🔄 Pulling latest image..."
docker pull "$IMAGE"

echo "🛑 Stopping existing containers..."
docker compose down --remove-orphans 2>/dev/null || true

echo "▶️  Starting containers..."
docker compose up -d

echo "⏳ Waiting for app to start..."
sleep 10

echo ""
if docker ps | grep -q izo-crm-dashboard; then
  echo "✅ Running at http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VPS_IP')"
  echo ""
  echo "Useful commands:"
  echo "  Logs:    docker compose logs -f"
  echo "  Stop:    docker compose down"
  echo "  Restart: docker compose restart"
  echo "  Shell:   docker exec -it izo-crm-dashboard sh"
else
  echo "❌ Failed to start. Check logs:"
  docker compose logs --tail=50
  exit 1
fi
