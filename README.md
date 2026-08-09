# CWA Admin

Admin-only frontend for CrackWithAI.

## Dokploy env

```env

ADMIN_API_BASE_URL=https://api.crackwithai.net/api
PORT=3000
```

## Deploy build

Railway uses Nixpacks through `railway.json`, so it will not invoke Docker by default.

Use Docker Compose when another platform asks for a Docker build context. The included
`docker-compose.yml` sets `build.context: .`, which avoids running `docker buildx build`
without a final app path.

The app stores only the admin JWT in browser `localStorage` and sends it as a Bearer token to admin-protected backend routes.

## First super admin

Create the first super admin from the setup panel using the backend `ADMIN_SETUP_SECRET`. After the first admin exists, bootstrap is blocked by the backend.
