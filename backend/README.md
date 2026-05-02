# HCMS Backend (MVP)

Node.js + Express + PostgreSQL backend for the Healthcare Management System MVP.

## Architecture

```
Booking Channels (Reception | Website | Phone)
            │
            ▼
        API Layer  ──► Auth · Patients · Doctors · Appointments · Notes · Invoices
            │
            ▼
   Core Business Logic ──► Scheduling Engine (single source of truth for bookings)
            │
            ▼
        PostgreSQL ──► users · patients · doctors · appointments · notes · invoices
```

Every booking — no matter the channel — flows through `src/services/schedulingEngine.js`.
The `appointments.channel` column records the source (`reception` | `website` | `phone`).

## Prerequisites

- Node.js 18+
- PostgreSQL 13+ running locally (or accessible via env vars)

## Setup

```bash
cd backend
npm install
copy .env.example .env       # Windows
# cp .env.example .env       # macOS / Linux
```

Edit `.env` and adjust `PG*` settings if your local Postgres differs.

Create the database (run once in `psql` or any GUI):

```sql
CREATE DATABASE hcms;
```

Apply the schema and seed demo data:

```bash
npm run db:reset
```

This creates all tables and inserts:

- **Admin login** — `admin@clinic.local` / `admin123`
- 3 doctors, 3 patients, 2 demo appointments, 1 demo invoice

## Run

```bash
npm run dev      # auto-reload (Node --watch)
npm start        # plain start
```

Server listens on `http://localhost:4000`.

## API surface (summary)

| Method | Path                              | Auth | Purpose                              |
| ------ | --------------------------------- | ---- | ------------------------------------ |
| GET    | `/health`                         | —    | Liveness check                       |
| POST   | `/api/auth/register`              | —    | Create staff account                 |
| POST   | `/api/auth/login`                 | —    | Get JWT                              |
| GET    | `/api/auth/me`                    | ✓    | Current user profile                 |
| GET    | `/api/patients`                   | ✓    | List / search patients               |
| POST   | `/api/patients`                   | ✓    | Create patient                       |
| GET    | `/api/patients/:id`               | ✓    | Get patient                          |
| PATCH  | `/api/patients/:id`               | ✓    | Update patient                       |
| DELETE | `/api/patients/:id`               | ✓    | Delete patient                       |
| GET    | `/api/patients/:id/notes`         | ✓    | List notes for patient               |
| POST   | `/api/notes`                      | ✓    | Add note                             |
| DELETE | `/api/notes/:id`                  | ✓    | Delete note                          |
| GET    | `/api/doctors/public`             | —    | Public doctor list (website booking) |
| GET    | `/api/doctors`                    | ✓    | List doctors                         |
| POST   | `/api/doctors`                    | ✓    | Create doctor                        |
| PATCH  | `/api/doctors/:id`                | ✓    | Update doctor                        |
| DELETE | `/api/doctors/:id`                | ✓    | Delete doctor                        |
| POST   | `/api/appointments/public`        | —    | **Website channel booking**          |
| GET    | `/api/appointments`               | ✓    | List / filter appointments           |
| POST   | `/api/appointments`               | ✓    | Reception/phone channel booking      |
| PATCH  | `/api/appointments/:id/status`    | ✓    | Update status                        |
| DELETE | `/api/appointments/:id`           | ✓    | Delete                               |
| GET    | `/api/invoices`                   | ✓    | List invoices                        |
| POST   | `/api/invoices`                   | ✓    | Create invoice                       |
| PATCH  | `/api/invoices/:id/status`        | ✓    | Mark paid / unpaid                   |

Auth: `Authorization: Bearer <jwt>` from `/api/auth/login`.

## Layout

```
backend/
  src/
    config/db.js          ── pg pool
    middleware/auth.js    ── JWT
    middleware/errorHandler.js
    services/schedulingEngine.js   ── core booking logic
    controllers/*.js
    routes/*.js
    server.js
  db/schema.sql
  scripts/initDb.js
  scripts/seedDb.js
```

## Skipped (intentional MVP scope)

- Pharmacy integration
- Insurance integration
- Structured medical records / clinical decision support
- AI services (placeholder layer only)
