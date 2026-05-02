-- ============================================================
--  HEALTH CARE MANAGEMENT SYSTEM — MVP Database Schema
--  Engine: PostgreSQL
--  Principles:
--    * One patient record across the system
--    * Everything links via IDs
--    * Minimal tables, easy to extend later
-- ============================================================

-- Drop in reverse-dependency order (safe re-run during dev only)
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------
--  USERS  (staff / admin / doctor logins)
--  Powers the Auth layer in the API.
-- ------------------------------------------------------------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'staff',  -- staff | admin | doctor
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
--  PATIENTS
--  phone is UNIQUE → prevents duplicate patients across channels.
-- ------------------------------------------------------------
CREATE TABLE patients (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(20)  UNIQUE,
    email       VARCHAR(100),
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
--  DOCTORS
-- ------------------------------------------------------------
CREATE TABLE doctors (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    specialty   VARCHAR(100),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
--  APPOINTMENTS
--  channel tracks WHERE the booking originated:
--    reception | website | phone
-- ------------------------------------------------------------
CREATE TABLE appointments (
    id                SERIAL PRIMARY KEY,
    patient_id        INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id         INTEGER NOT NULL REFERENCES doctors(id)  ON DELETE RESTRICT,
    appointment_time  TIMESTAMP NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'booked',   -- booked | completed | cancelled | no_show
    channel           VARCHAR(20) NOT NULL DEFAULT 'reception',-- reception | website | phone
    created_at        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes for the scheduling engine
CREATE INDEX idx_appointments_doctor_time ON appointments(doctor_id, appointment_time);
CREATE INDEX idx_appointments_patient     ON appointments(patient_id);
CREATE INDEX idx_appointments_status      ON appointments(status);

-- ------------------------------------------------------------
--  NOTES  (light CRM + light clinical)
-- ------------------------------------------------------------
CREATE TABLE notes (
    id          SERIAL PRIMARY KEY,
    patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_patient ON notes(patient_id);

-- ------------------------------------------------------------
--  INVOICES  (basic billing)
-- ------------------------------------------------------------
CREATE TABLE invoices (
    id          SERIAL PRIMARY KEY,
    patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    amount      DECIMAL(10,2) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'unpaid',  -- unpaid | paid
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_status  ON invoices(status);
