#!/bin/bash
set -e

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "🔄 Pulling latest code from git..."
git pull || echo "⚠️  Git pull skipped (not a git repo or no changes)"

echo "🛑 Stopping and removing all containers..."
docker compose down --remove-orphans || true
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

echo "🧹 Aggressive cleanup of Docker resources..."
# Remove all stopped containers
docker container prune -f

# Remove all unused images (including tagged ones)
docker image prune -a -f

# Remove all unused volumes
docker volume prune -f

# Remove all unused networks
docker network prune -f

# Remove all build cache
docker builder prune -a -f

# Remove specific image if it exists
docker rmi izo-crm-dashboard:latest 2>/dev/null || true

echo "💾 Disk space before build:"
df -h | grep -E '(Filesystem|/$)'

echo "🔨 Building new image with no cache..."
docker compose build --no-cache --pull

echo "💾 Disk space after build:"
df -h | grep -E '(Filesystem|/$)'

echo "▶️  Starting container..."
docker compose up -d

echo "⏳ Waiting for application to start..."
sleep 30

# Check if container is running
if docker ps | grep -q izo-crm-dashboard; then
    echo ""
    echo "✅ Deployment successful! 🎉"
    echo "🌐 Application: http://localhost:3000"
    echo ""
    echo "📋 Container status:"
    docker compose ps
    echo ""
    echo "🔍 Health check:"
    docker compose exec app wget --quiet --tries=1 --spider http://localhost:3000 && echo "✅ App is responding" || echo "⚠️  App health check failed"
    echo ""
    echo "📊 Recent logs:"
    docker compose logs --tail=30
    echo ""
    echo "Commands:"
    echo "  Logs:    docker compose logs -f"
    echo "  Stop:    docker compose down"
    echo "  Restart: docker compose restart"
    echo "  Shell:   docker exec -it izo-crm-dashboard sh"
    echo "  Clean:   docker system prune -a -f"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "📋 Full logs:"
    docker compose logs
    echo ""
    echo "🔍 Container status:"
    docker compose ps -a
    exit 1
fi
