# Deploy demo to Render (free tier)

Share a live URL with your partner while waiting for Africala. **Cost: $0** on Free plans (backend sleeps after 15 min idle; DB expires after 30 days).

## Prerequisites

- GitHub repo pushed: `https://github.com/xizambi2025/hcms-mvp`
- [Render account](https://render.com) (sign in with GitHub)

---

## Step 1 — PostgreSQL

1. Render Dashboard → **New** → **PostgreSQL**
2. Name: `hcms-db` · Plan: **Free** · Region: closest to you
3. Create → copy **Internal Database URL** (starts with `postgres://`)

---

## Step 2 — Backend (API)

1. **New** → **Web Service** → connect repo `hcms-mvp`
2. Settings:

| Field | Value |
|---|---|
| Name | `hcms-api` |
| Root directory | `backend` |
| Runtime | Node |
| Build command | `npm install` |
| Start command | `npm start` |
| Plan | **Free** |

3. **Environment** (add each variable):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | long random string |
| `CORS_ORIGINS` | *(fill after Step 3 — your frontend URL)* |
| `WHATSAPP_PROVIDER` | `local` |
| `PGHOST` | from Render Postgres **host** |
| `PGPORT` | `5432` |
| `PGUSER` | from Postgres credentials |
| `PGPASSWORD` | from Postgres credentials |
| `PGDATABASE` | from Postgres credentials |
| `PGAPPUSER` | `hcms_app` |
| `PGAPPPASSWORD` | `hcms_app` |

4. Deploy → wait for **Live** URL, e.g. `https://hcms-api.onrender.com`

5. **Initialize database** (once): Web Service → **Shell**:

```bash
npm run db:reset
```

6. Test: open `https://hcms-api.onrender.com/health` → should show `"status":"ok"`

---

## Step 3 — Frontend (static site)

1. **New** → **Static Site** → same repo
2. Settings:

| Field | Value |
|---|---|
| Name | `hcms-web` |
| Root directory | `frontend` |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |
| Plan | **Free** |

3. **Environment** (build-time):

| Key | Value |
|---|---|
| `VITE_API_BASE` | `https://hcms-api.onrender.com/api` |

*(Use your actual backend URL from Step 2.)*

4. Deploy → copy site URL, e.g. `https://hcms-web.onrender.com`

5. Go back to **hcms-api** → Environment → set `CORS_ORIGINS` to your frontend URL → **Manual Deploy**

---

## Step 4 — Share with partner

Send them:

- **App:** `https://hcms-web.onrender.com`
- **Login:** `admin@clinic.local` / `admin123`
- **Public booking:** `https://hcms-web.onrender.com/book`
- **Chatbot demo:** Conversations → local simulator (no Africala needed)

Invite them to the GitHub repo: **Settings → Collaborators**.

---

## Free tier notes

- First request after ~15 min idle may take **~1 minute** (backend waking up).
- Free Postgres **expires after 30 days** — fine for a demo; upgrade (~$6/mo) for production.
- Do **not** commit `.env` files; set secrets only in Render dashboard.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Login fails / CORS error | `CORS_ORIGINS` must exactly match frontend URL (no trailing slash) |
| Empty patients / 500 errors | Run `npm run db:reset` in backend Shell |
| Frontend can't reach API | Rebuild static site after setting `VITE_API_BASE` |
| Cold start slow | Normal on Free — click again or upgrade backend to Starter |
