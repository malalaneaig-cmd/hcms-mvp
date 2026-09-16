# Deploy demo to Render (free tier)

Share a live URL with your partner while waiting for Africala. **Cost: $0** on Free plans (backend sleeps after 15 min idle; DB expires after 30 days).

## Prerequisites

- GitHub repo pushed: `https://github.com/malalaneaig-cmd/hcms-mvp`
- [Render account](https://render.com) — sign in with GitHub

---

## Step 1 — PostgreSQL

1. [Render Dashboard](https://dashboard.render.com) → **New +** → **PostgreSQL**
2. **Name:** `hcms-db` · **Plan:** Free · **Region:** closest to you (e.g. Frankfurt)
3. **Create Database**
4. Open the new database → **Info** tab → copy these fields (you need all of them):

| Render field | Maps to env var |
|---|---|
| Hostname | `PGHOST` |
| Port | `PGPORT` (usually `5432`) |
| Database | `PGDATABASE` |
| Username | `PGUSER` |
| Password | `PGPASSWORD` |

Keep this tab open — you will paste these into the backend service next.

---

## Step 2 — Backend (API)

1. **New +** → **Web Service**
2. Connect GitHub → select repo **`malalaneaig-cmd/hcms-mvp`**
3. Settings:

| Field | Value |
|---|---|
| Name | `hcms-api` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | **Free** |

4. **Environment Variables** — add each row:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | long random string (e.g. 32+ chars) |
| `CORS_ORIGINS` | `https://placeholder.onrender.com` *(update after Step 3)* |
| `WHATSAPP_PROVIDER` | `local` |
| `PGHOST` | from Step 1 |
| `PGPORT` | `5432` |
| `PGUSER` | from Step 1 |
| `PGPASSWORD` | from Step 1 |
| `PGDATABASE` | from Step 1 *(exact name Render gave you — not `hcms`)* |
| `PGAPPUSER` | `hcms_app` |
| `PGAPPPASSWORD` | `hcms_app` |

5. **Create Web Service** → wait until status is **Live**
6. Copy the URL, e.g. `https://hcms-api.onrender.com`
7. Test: open `https://hcms-api.onrender.com/health` → should show `"status":"ok"`

### Initialize database (once)

1. Open **hcms-api** → **Shell** tab (top menu)
2. Run:

```bash
npm run db:reset
```

You should see schema + security + seed messages ending with demo users created.

3. Re-test `/health`, then try login after frontend is deployed.

---

## Step 3 — Frontend (static site)

1. **New +** → **Static Site** → same repo `malalaneaig-cmd/hcms-mvp`
2. Settings:

| Field | Value |
|---|---|
| Name | `hcms-web` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

3. **Environment Variables** (build-time):

| Key | Value |
|---|---|
| `VITE_API_BASE` | `https://hcms-api.onrender.com/api` |

*(Replace with your actual backend URL from Step 2 — include `/api`, no trailing slash.)*

4. **Create Static Site** → wait for deploy → copy URL, e.g. `https://hcms-web.onrender.com`

5. **Fix CORS:** open **hcms-api** → **Environment** → set `CORS_ORIGINS` to your frontend URL exactly:

```
https://hcms-web.onrender.com
```

No trailing slash. Save → **Manual Deploy** on the backend.

6. Open the frontend URL → log in with `admin@clinic.local` / `admin123`

---

## Step 4 — Share with partner

Send them:

- **App:** `https://hcms-web.onrender.com`
- **Login:** `admin@clinic.local` / `admin123`
- **Public booking:** `https://hcms-web.onrender.com/book`
- **Chatbot demo:** Conversations → local simulator (no Africala needed)

Invite them on GitHub: repo → **Settings** → **Collaborators** → **Add people**.

---

## Free tier notes

- First request after ~15 min idle may take **~1 minute** (backend waking up).
- Free Postgres **expires after 30 days** — fine for a demo; upgrade (~$7/mo) for production.
- Do **not** commit `.env` files; set secrets only in Render dashboard.
- Push code fixes to GitHub before redeploying — Render pulls from the repo on each deploy.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Login fails / CORS error | `CORS_ORIGINS` must exactly match frontend URL (no trailing slash) |
| `db:reset` fails on SSL | Ensure latest code is deployed (`NODE_ENV=production` enables SSL) |
| `permission denied` / wrong database | `PGDATABASE` must match Render **Database** name exactly |
| Empty patients / 500 errors | Run `npm run db:reset` again in backend Shell |
| Frontend can't reach API | Rebuild static site after setting `VITE_API_BASE` |
| Cold start slow | Normal on Free — wait ~1 min or upgrade backend to Starter |
