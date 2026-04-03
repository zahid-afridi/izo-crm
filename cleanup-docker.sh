#!/bin/bash

echo "🧹 Docker Cleanup Script"
echo "========================"

echo "💾 Disk space before cleanup:"
df -h | grep -E '(Filesystem|/$)'

echo ""
echo "🛑 Stopping all containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

echo "🗑️  Removing all containers..."
docker rm $(docker ps -aq) 2>/dev/null || true

echo "🖼️  Removing all images..."
docker rmi $(docker images -aq) 2>/dev/null || true

echo "📦 Removing all volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null || true

echo "🌐 Removing all networks..."
docker network rm $(docker network ls -q) 2>/dev/null || true

echo "🔧 Removing build cache..."
docker builder prune -a -f

echo "🧽 System-wide cleanup..."
docker system prune -a -f --volumes

echo ""
echo "💾 Disk space after cleanup:"
df -h | grep -E '(Filesystem|/$)'

echo ""
echo "✅ Docker cleanup completed!"
echo "📋 Remaining Docker objects:"
echo "Containers: $(docker ps -a --format 'table {{.Names}}\t{{.Status}}' | wc -l)"
echo "Images: $(docker images --format 'table {{.Repository}}\t{{.Tag}}' | wc -l)"
echo "Volumes: $(docker volume ls --format 'table {{.Name}}' | wc -l)"
echo "Networks: $(docker network ls --format 'table {{.Name}}' | wc -l)"