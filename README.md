# IZO CRM Dashboard

## Quick Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

Application will be available at: http://localhost:3000

## Commands

```bash
# View logs
docker compose logs -f

# Stop
docker compose down

# Restart
docker compose restart

# Rebuild
docker compose build
docker compose up -d
```

## Configuration

Edit environment variables in `docker-compose.yml`:
- DATABASE_URL
- JWT_SECRET
- CLOUDINARY credentials

## Build Time

- First build: 3-5 minutes
- Subsequent builds: 30-60 seconds
- Code changes only: 10-20 seconds
