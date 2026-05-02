# Healthcare Management System — MVP

A clean, MVP-ready clinic management system built strictly to the architecture spec:

- **One backend** for everything (all booking channels go through the same API)
- **Central scheduling engine** — every appointment, regardless of channel, flows through a single function
- **Single source of truth** PostgreSQL database
- **3 booking channels supported**: reception · website · phone
- **AI is an optional layer** (placeholder in architecture, intentionally not implemented in MVP)

## High-level architecture

```
        BOOKING CHANNELS (Reception · Website · Phone)
                       │
                       ▼
                 API Layer  (Express)
        Auth · Patients · Doctors · Appointments · Notes · Invoices
                       │
                       ▼
              CORE BUSINESS LOGIC
       Scheduling Engine · Patient Mgmt · Basic Billing · (AI later)
                       │
                       ▼
                  PostgreSQL
   users · patients · doctors · appointments · notes · invoices
                       │
                       ▼
       EXTERNAL SERVICES (LATER) — SMS · Payments · AI
```

## What's included (MVP scope)

| Module                  | Status              |
| ----------------------- | ------------------- |
| Appointments booking    | ✅ Fully included    |
| 3 booking channels      | ✅ Fully included    |
| CRM (basic)             | ⚠️ Notes + contacts  |
| Clinical (light)        | ⚠️ Notes only        |
| Billing                 | ✅ Basic invoices    |
| AI Doctor Assistant     | ❌ Future (placeholder layer) |
| Pharmacy integration    | ❌ Skipped on purpose |
| Insurance integration   | ❌ Skipped on purpose |

## Repository layout

```
NEW BUILD - MINIMUM MVP/
├── backend/        Node.js + Express + PostgreSQL API
├── frontend/       React + Vite + Tailwind UI
└── README.md       (this file)
```

See `backend/README.md` and `frontend/README.md` for module-specific docs.

## Quick start

### 1) Database

Install PostgreSQL 13+ locally and create the database:

```sql
CREATE DATABASE hcms;
```

### 2) Backend

```bash
cd backend
npm install
copy .env.example .env       # edit PG* values to match your local Postgres
npm run db:reset             # creates schema + inserts demo data
npm run dev                  # → http://localhost:4000
```

### 3) Frontend

```bash
cd frontend
npm install
npm run dev                  # → http://localhost:5173
```

### 4) Sign in

- Staff dashboard: <http://localhost:5173/login>
  - email: `admin@clinic.local`
  - password: `admin123`
- Public booking page: <http://localhost:5173/book>

## The 3 booking channels — how each one books

All three end up in the same `appointments` row, with the `channel` column distinguishing them:

| Channel       | UI                                | API call                                                  |
| ------------- | --------------------------------- | --------------------------------------------------------- |
| `reception`   | Dashboard → Appointments → "Book" | `POST /api/appointments` (auth) with `channel:"reception"`|
| `phone`       | Same modal, channel toggle        | `POST /api/appointments` (auth) with `channel:"phone"`    |
| `website`     | Public `/book` page               | `POST /api/appointments/public` (no auth)                 |

The public website endpoint also auto-creates the patient if their phone number isn't already known — preventing duplicate patient records across channels.

## Development methodology (followed)

1. ✅ Architecture defined → 2. ✅ Database designed → 3. ✅ Backend built → 4. ✅ UI screens built

Future upgrade path (post-MVP, only after approval):

- Proper CRM layer (lifecycle, comms log, segmentation)
- Real Clinical Module (structured records, prescriptions, attachments)
- AI Assistant v1 (symptom triage, summaries)
