# CWA Admin

Admin-only frontend for CrackWithAI.

## Dokploy env

```env

ADMIN_API_BASE_URL=https://api.crackwithai.net/api
PORT=3000
```

## Deploy build

Use Nixpacks for deployment. The admin repo intentionally does not include a
Dockerfile, so platforms should not auto-select Docker and run `docker buildx build`
without a context path.

The app stores only the admin JWT in browser `localStorage` and sends it as a Bearer token to admin-protected backend routes.

## First super admin

Create the first super admin from the setup panel using the backend `ADMIN_SETUP_SECRET`. After the first admin exists, bootstrap is blocked by the backend.
