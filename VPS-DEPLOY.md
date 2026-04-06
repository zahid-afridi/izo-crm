# VPS Deployment Guide — IZO CRM

## Overview

```
Local Machine  →  Build & Push image  →  GitHub Container Registry (ghcr.io)
VPS            →  Pull image          →  Run container with .env
```

---

## 1. One-Time Setup (Local Machine)

### Login to GitHub Container Registry

```bash
# Generate a GitHub Personal Access Token (PAT) with:
# - read:packages
# - write:packages
# - delete:packages
# Go to: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

---

## 2. Build & Push Image (Local Machine)

Replace `your-github-username` and `izo-crm` with your actual values.

```bash
# Build the image
docker build -t ghcr.io/your-github-username/izo-crm:latest .

# Push to GitHub Container Registry
docker push ghcr.io/your-github-username/izo-crm:latest

# Optional: tag with a version as well
docker tag ghcr.io/your-github-username/izo-crm:latest ghcr.io/your-github-username/izo-crm:v1.0.0
docker push ghcr.io/your-github-username/izo-crm:v1.0.0
```

---

## 3. One-Time Setup (VPS)

### Install Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### Login to GitHub Container Registry on VPS

```bash
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Create app directory and upload .env

```bash
mkdir -p /opt/izo-crm
cd /opt/izo-crm

# Upload your .env from local machine (run this on your local machine):
# scp .env root@YOUR_VPS_IP:/opt/izo-crm/.env
```

### Create docker-compose.yml on VPS

```bash
cat > /opt/izo-crm/docker-compose.yml << 'EOF'
services:
  app:
    image: ghcr.io/your-github-username/izo-crm:latest
    container_name: izo-crm-dashboard
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      NODE_ENV: production
EOF
```

---

## 4. Deploy / Update on VPS

```bash
cd /opt/izo-crm

# Pull latest image
docker pull ghcr.io/your-github-username/izo-crm:latest

# Stop old container and start new one
docker compose down
docker compose up -d

# Verify it's running
docker compose ps
```

---

## 5. Useful Commands

### Logs

```bash
# Follow live logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Logs for specific time
docker compose logs --since="2024-01-01T00:00:00"
```

### Container Management

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart
docker compose restart

# Open shell inside container
docker exec -it izo-crm-dashboard sh

# Check running containers
docker ps

# Check all containers (including stopped)
docker ps -a
```

### Image Management

```bash
# List all images
docker images

# Pull latest image
docker pull ghcr.io/your-github-username/izo-crm:latest

# Remove a specific image
docker rmi ghcr.io/your-github-username/izo-crm:latest

# Remove all unused images
docker image prune -a -f

# Remove all stopped containers
docker container prune -f
```

### Full Cleanup

```bash
# Remove everything unused (images, containers, networks, cache)
docker system prune -a -f

# Remove everything including volumes (careful — deletes data)
docker system prune -a --volumes -f
```

### Check Disk Usage

```bash
docker system df
```

---

## 6. Full Update Flow (Every Deployment)

Run this on your **local machine** when you have new code:

```bash
# 1. Build new image
docker build -t ghcr.io/your-github-username/izo-crm:latest .

# 2. Push to registry
docker push ghcr.io/your-github-username/izo-crm:latest
```

Then SSH into your **VPS**:

```bash
cd /opt/izo-crm

# 3. Pull new image
docker pull ghcr.io/your-github-username/izo-crm:latest

# 4. Restart with new image
docker compose down && docker compose up -d

# 5. Check logs
docker compose logs -f
```

---

## 7. Make the Image Public (Optional)

If you don't want to login on the VPS, make the package public:

```
GitHub → Your Profile → Packages → izo-crm → Package settings → Change visibility → Public
```

Then on VPS you can pull without login:

```bash
docker pull ghcr.io/your-github-username/izo-crm:latest
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Build image | `docker build -t ghcr.io/USER/izo-crm:latest .` |
| Push image | `docker push ghcr.io/USER/izo-crm:latest` |
| Pull image | `docker pull ghcr.io/USER/izo-crm:latest` |
| Start app | `docker compose up -d` |
| Stop app | `docker compose down` |
| Restart app | `docker compose restart` |
| View logs | `docker compose logs -f` |
| Shell access | `docker exec -it izo-crm-dashboard sh` |
| Clean images | `docker image prune -a -f` |
| Full cleanup | `docker system prune -a -f` |
