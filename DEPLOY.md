# Production deploy (Mozambique / any VPS)

Africala cannot send WhatsApp/SMS webhooks to `localhost`. You need a public HTTPS URL.

Recommended webhook URLs after deploy:

- WhatsApp: `https://YOUR-DOMAIN/api/webhooks/whatsapp`
- SMS: `https://YOUR-DOMAIN/api/webhooks/sms`

## Option A — Docker on a VPS (recommended)

On a Ubuntu VPS (DigitalOcean, Hetzner, Contabo, etc.):

```bash
git clone <this-repo>
cd "NEW BUILD - MINIMUM MVP"
# or copy the project folder onto the server

# First-time database
docker compose up -d db
docker compose run --rm backend npm run db:reset

# App
JWT_SECRET=a-long-random-string docker compose up -d --build
```

Then put Nginx or Caddy in front for HTTPS, pointing to port 80.

After Africala gives you keys, create a `.env` next to `docker-compose.yml`:

```
WHATSAPP_PROVIDER=africala
AFRICALA_API_KEY=...
AFRICALA_WEBHOOK_SECRET=...
AFRICALA_SMS_SENDER_ID=CLINICA
JWT_SECRET=replace-this
CORS_ORIGINS=https://YOUR-DOMAIN
```

Restart: `docker compose up -d`

## Option B — Render / Railway / Fly.io

1. Create a PostgreSQL addon.
2. Deploy `backend/` as a Node web service:
   - start command: `npm start`
   - health check: `/health`
3. Deploy `frontend/` as a static site (`npm run build`, publish `dist/`).
4. Point the frontend API to the backend URL (or reverse-proxy `/api`).
5. Set the same env vars as in Option A.

## After Africala + Meta are approved

1. Set `WHATSAPP_PROVIDER=africala` and paste the API key.
2. Give Africala the public webhook URLs above.
3. Send a test WhatsApp message to the clinic number.
4. Confirm the thread appears under **Conversas** in the staff dashboard.

Nothing in the chatbot needs to be rewritten for that step — it is already channel-ready.
