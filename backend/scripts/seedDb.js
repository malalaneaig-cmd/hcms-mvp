import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { buildPoolConfig } from '../src/config/pgPool.js';

const { Pool } = pg;

const adminPool = new Pool(buildPoolConfig());

const ADMIN_EMAIL    = 'admin@clinic.local';
const ADMIN_PASSWORD = 'admin123';

async function run() {
  console.log('Seeding database...');

  const client = await adminPool.connect();
  try {
    await client.query(`SELECT set_config('app.role', 'system', false)`);
    await seed(client);
  } finally {
    client.release();
    await adminPool.end();
  }
}

async function seed(client) {
  await client.query(
    'TRUNCATE audit_logs, chatbot_messages, chatbot_escalations, chatbot_sessions, invoices, notes, appointments, doctor_schedules, patient_profiles, doctors, patients, users RESTART IDENTITY CASCADE'
  );

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await client.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)`,
    [ADMIN_EMAIL, hash, 'Clinic Admin', 'admin']
  );
  console.log(`  • admin user → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  const weekdayHours = [
    { weekday: 1, start: '08:00', end: '12:00' },
    { weekday: 1, start: '14:00', end: '16:30' },
    { weekday: 2, start: '08:00', end: '12:00' },
    { weekday: 2, start: '14:00', end: '16:30' },
    { weekday: 3, start: '08:00', end: '12:00' },
    { weekday: 3, start: '14:00', end: '16:30' },
    { weekday: 4, start: '08:00', end: '12:00' },
    { weekday: 4, start: '14:00', end: '16:30' },
    { weekday: 5, start: '08:00', end: '12:00' },
    { weekday: 5, start: '14:00', end: '16:30' },
  ];
  const saturdayMorning = [{ weekday: 6, start: '08:00', end: '12:00' }];

  const doctors = [
    ['Dra. Aisha Hassan',  'Clínica Geral'],
    ['Dr. Mohamed Ali',    'Pediatria'],
    ['Dra. Sarah Ibrahim', 'Cardiologia'],
  ];

  const doctorIds = [];
  for (let i = 0; i < doctors.length; i++) {
    const [name, specialty] = doctors[i];
    const { rows } = await client.query(
      `INSERT INTO doctors (name, specialty) VALUES ($1, $2) RETURNING id`,
      [name, specialty]
    );
    const doctorId = rows[0].id;
    doctorIds.push(doctorId);
    const blocks = i === 0 ? [...weekdayHours, ...saturdayMorning] : weekdayHours;
    for (const block of blocks) {
      await client.query(
        `INSERT INTO doctor_schedules (doctor_id, weekday, start_time, end_time) VALUES ($1, $2, $3, $4)`,
        [doctorId, block.weekday, block.start, block.end]
      );
    }
  }
  console.log(`  • inserted ${doctors.length} doctors with clinic hours`);

  const DOCTOR_PASSWORD = 'doctor123';
  const doctorHash = await bcrypt.hash(DOCTOR_PASSWORD, 10);
  const doctorAccounts = [
    ['doctor1@clinic.local', 'Dra. Aisha Hassan'],
    ['doctor2@clinic.local', 'Dr. Mohamed Ali'],
    ['doctor3@clinic.local', 'Dra. Sarah Ibrahim'],
  ];
  for (let i = 0; i < doctorAccounts.length; i++) {
    const [email, fullName] = doctorAccounts[i];
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, doctor_id)
       VALUES ($1, $2, $3, 'doctor', $4)`,
      [email, doctorHash, fullName, doctorIds[i]]
    );
  }
  console.log(`  • doctor logins → doctor1@clinic.local … doctor3@clinic.local / ${DOCTOR_PASSWORD}`);

  const patients = [
    ['Carlos Machava',   '+258841111111', 'carlos@example.com',  'Paciente regular.'],
    ['Fátima Nhantumbo', '+258842222222', 'fatima@example.com',  null],
    ['João Sitoe',       '+258843333333', null,                  'Alérgico à penicilina.'],
  ];
  for (const [name, phone, email, clinicalNotes] of patients) {
    const { rows } = await client.query(
      `INSERT INTO patients (name, phone, email) VALUES ($1, $2, $3) RETURNING id`,
      [name, phone, email]
    );
    await client.query(
      `INSERT INTO patient_profiles (patient_id, clinical_notes) VALUES ($1, $2)`,
      [rows[0].id, clinicalNotes]
    );
  }
  console.log(`  • inserted ${patients.length} patients with profiles`);

  const t = new Date(); t.setDate(t.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  const tomorrow9  = `${date}T09:00:00`;
  const tomorrow10 = `${date}T10:30:00`;
  const tomorrow11 = `${date}T11:00:00`;

  await client.query(
    `INSERT INTO appointments (patient_id, doctor_id, appointment_time, status, channel)
     VALUES (1, 1, $1, 'booked', 'reception'),
            (2, 2, $2, 'booked', 'website'),
            (3, 3, $3, 'booked', 'phone')`,
    [tomorrow9, tomorrow10, tomorrow11]
  );
  console.log('  • inserted 3 demo appointments');

  await client.query(
    `INSERT INTO invoices (patient_id, amount, status) VALUES (1, 50.00, 'unpaid')`
  );
  console.log('  • inserted 1 demo invoice');

  console.log('✓ Seed complete.');
}

run().catch((err) => {
  console.error('✗ seedDb failed:', err.message);
  process.exit(1);
});
