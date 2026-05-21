import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const ADMIN_EMAIL    = 'admin@clinic.local';
const ADMIN_PASSWORD = 'admin123';

async function run() {
  console.log('Seeding database...');

  // Wipe in dependency order so re-running is safe
  await pool.query('TRUNCATE invoices, notes, appointments, doctors, patients, users RESTART IDENTITY CASCADE');

  // ─── Default admin ─────────────────────────────────────
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)`,
    [ADMIN_EMAIL, hash, 'Clinic Admin', 'admin']
  );
  console.log(`  • admin user → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  // ─── Doctors ───────────────────────────────────────────
  const doctors = [
    ['Dr. Aisha Hassan',  'General Practice'],
    ['Dr. Mohamed Ali',   'Pediatrics'],
    ['Dr. Sarah Ibrahim', 'Cardiology'],
  ];
  for (const [name, specialty] of doctors) {
    await pool.query(
      `INSERT INTO doctors (name, specialty) VALUES ($1, $2)`,
      [name, specialty]
    );
  }
  console.log(`  • inserted ${doctors.length} doctors`);

  // ─── Patients ──────────────────────────────────────────
  const patients = [
    ['Ahmed Yusuf',  '+252611111111', 'ahmed@example.com',  'Walks in regularly.'],
    ['Fadumo Omar',  '+252612222222', 'fadumo@example.com', null],
    ['Hassan Abdi',  '+252613333333', null,                 'Allergic to penicillin.'],
  ];
  for (const [name, phone, email, notes] of patients) {
    await pool.query(
      `INSERT INTO patients (name, phone, email, notes) VALUES ($1, $2, $3, $4)`,
      [name, phone, email, notes]
    );
  }
  console.log(`  • inserted ${patients.length} patients`);

  // ─── A couple of demo appointments (tomorrow) ─────────
  // Build naive ISO strings (no UTC conversion) so the time the user sees
  // on screen matches what we intended here — see AppointmentsPage for the
  // full explanation of why we avoid .toISOString() in this codebase.
  const t = new Date(); t.setDate(t.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  const tomorrow9  = `${date}T09:00:00`;
  const tomorrow10 = `${date}T10:30:00`;

  await pool.query(
    `INSERT INTO appointments (patient_id, doctor_id, appointment_time, status, channel)
     VALUES (1, 1, $1, 'booked', 'reception'),
            (2, 2, $2, 'booked', 'website')`,
    [tomorrow9, tomorrow10]
  );
  console.log('  • inserted 2 demo appointments');

  // ─── Demo invoice ──────────────────────────────────────
  await pool.query(
    `INSERT INTO invoices (patient_id, amount, status) VALUES (1, 50.00, 'unpaid')`
  );
  console.log('  • inserted 1 demo invoice');

  console.log('✓ Seed complete.');
  await pool.end();
}

run().catch((err) => {
  console.error('✗ seedDb failed:', err.message);
  process.exit(1);
});
