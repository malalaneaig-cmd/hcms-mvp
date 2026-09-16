import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes         from './routes/auth.js';
import patientsRoutes     from './routes/patients.js';
import doctorsRoutes      from './routes/doctors.js';
import appointmentsRoutes from './routes/appointments.js';
import notesRoutes        from './routes/notes.js';
import invoicesRoutes     from './routes/invoices.js';
import webhooksRoutes     from './routes/webhooks.js';
import conversationsRoutes from './routes/conversations.js';

import { errorHandler, notFound } from './middleware/errorHandler.js';
import { startReminderLoop } from './services/reminders.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ─── Middleware ────────────────────────────────────────────
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({ origin: corsOrigins, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// ─── Health check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hcms-backend', time: new Date().toISOString() });
});

// ─── API routes ────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/patients',     patientsRoutes);
app.use('/api/doctors',      doctorsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/notes',        notesRoutes);
app.use('/api/invoices',     invoicesRoutes);
app.use('/api/webhooks',      webhooksRoutes);
app.use('/api/conversations', conversationsRoutes);

// ─── 404 + error handlers (must be last) ───────────────────
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✓ HCMS backend listening on http://localhost:${PORT}`);
  console.log(`  CORS origins: ${corsOrigins.join(', ')}`);
  startReminderLoop();
});
