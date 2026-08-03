# CWA Admin

Admin-only frontend for CrackWithAI.

## Dokploy env

```env

ADMIN_API_BASE_URL=https://api.crackwithai.net/api
PORT=3000
```

The app stores only the admin JWT in browser `localStorage` and sends it as a Bearer token to admin-protected backend routes.

## First super admin

Create the first super admin from the setup panel using the backend `ADMIN_SETUP_SECRET`. After the first admin exists, bootstrap is blocked by the backend.
