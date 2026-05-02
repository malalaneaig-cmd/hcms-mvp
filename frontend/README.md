# HCMS Frontend (MVP)

React + Vite + Tailwind CSS UI for the Healthcare Management System MVP.

## Setup

```bash
cd frontend
npm install
```

The dev server proxies `/api/*` to `http://localhost:4000` (the backend).

## Run

```bash
npm run dev      # starts on http://localhost:5173
```

## Pages

| Route               | Auth | Purpose                                   |
| ------------------- | ---- | ----------------------------------------- |
| `/login`            | —    | Staff login                               |
| `/book`             | —    | **Public website booking** (channel=website) |
| `/`                 | ✓    | Dashboard (today's schedule + KPIs)       |
| `/appointments`     | ✓    | List + book (channels: reception, phone)  |
| `/patients`         | ✓    | List, search, create                      |
| `/patients/:id`     | ✓    | Detail · notes · appointments · invoices  |
| `/doctors`          | ✓    | List + add doctors                        |
| `/invoices`         | ✓    | List + create + mark paid                 |

Demo login (after running `npm run db:reset` in the backend):

```
admin@clinic.local
admin123
```

## Tech

- React 18 + React Router 6
- Vite 5
- Tailwind CSS 3 + custom component classes (`btn`, `card`, `input`, `badge…`)
- Axios with JWT bearer interceptor
- date-fns for formatting
