-- ============================================================
--  HEALTH CARE MANAGEMENT SYSTEM — MVP Database Schema
--  Engine: PostgreSQL
--  Principles:
--    * One patient record across the system
--    * Everything links via IDs
--    * Minimal tables, easy to extend later
-- ============================================================

-- Drop in reverse-dependency order (safe re-run during dev only)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS chatbot_messages CASCADE;
DROP TABLE IF EXISTS chatbot_escalations CASCADE;
DROP TABLE IF EXISTS chatbot_sessions CASCADE;
DROP TABLE IF EXISTS doctor_schedules CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

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
--  USERS  (staff / admin / doctor logins)
-- ------------------------------------------------------------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'staff',  -- staff | admin | doctor
    doctor_id       INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
--  DOCTOR SCHEDULES  (weekly working hours, multiple blocks/day)
--  weekday: 0=Sunday … 6=Saturday
-- ------------------------------------------------------------
CREATE TABLE doctor_schedules (
    id          SERIAL PRIMARY KEY,
    doctor_id   INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    weekday     SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    CHECK (start_time < end_time)
);

CREATE INDEX idx_doctor_schedules_doctor ON doctor_schedules(doctor_id, weekday);

-- ------------------------------------------------------------
--  PATIENTS  (identity / contact only — no clinical PHI)
-- ------------------------------------------------------------
CREATE TABLE patients (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(20)  UNIQUE,
    email       VARCHAR(100),
    deleted_at  TIMESTAMP,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_deleted ON patients(deleted_at);

-- ------------------------------------------------------------
--  PATIENT PROFILES  (PHI — clinical attributes)
-- ------------------------------------------------------------
CREATE TABLE patient_profiles (
    patient_id       INTEGER PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
    clinical_notes   TEXT,
    allergies        TEXT,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
--  APPOINTMENTS
--  channel tracks WHERE the booking originated:
--    reception | website | phone | whatsapp | sms
-- ------------------------------------------------------------
CREATE TABLE appointments (
    id                SERIAL PRIMARY KEY,
    patient_id        INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id         INTEGER NOT NULL REFERENCES doctors(id)  ON DELETE RESTRICT,
    appointment_time  TIMESTAMP NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'booked',   -- booked | completed | cancelled | no_show
    channel           VARCHAR(20) NOT NULL DEFAULT 'reception',-- reception | website | phone | whatsapp | sms
    reminded_at       TIMESTAMP,
    deleted_at        TIMESTAMP,
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

-- ------------------------------------------------------------
--  CHATBOT SESSIONS  (WhatsApp / SMS conversation state)
-- ------------------------------------------------------------
CREATE TABLE chatbot_sessions (
    id              SERIAL PRIMARY KEY,
    phone           VARCHAR(20)  NOT NULL,
    channel         VARCHAR(20)  NOT NULL DEFAULT 'whatsapp',
    state           VARCHAR(30)  NOT NULL DEFAULT 'greeting',
    patient_name    VARCHAR(100),
    doctor_id       INTEGER REFERENCES doctors(id),
    chosen_date     DATE,
    chosen_time     TIME,
    appointment_id  INTEGER REFERENCES appointments(id),
    failed_attempts INTEGER      NOT NULL DEFAULT 0,
    expires_at      TIMESTAMP    NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes'),
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chatbot_sessions_phone   ON chatbot_sessions(phone, channel);
CREATE INDEX idx_chatbot_sessions_expires ON chatbot_sessions(expires_at);

-- ------------------------------------------------------------
--  CHATBOT MESSAGES  (full conversation log)
-- ------------------------------------------------------------
CREATE TABLE chatbot_messages (
    id          SERIAL PRIMARY KEY,
    phone       VARCHAR(20)  NOT NULL,
    channel     VARCHAR(20)  NOT NULL DEFAULT 'whatsapp',
    direction   VARCHAR(10)  NOT NULL,
    body        TEXT         NOT NULL,
    session_id  INTEGER      REFERENCES chatbot_sessions(id) ON DELETE SET NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chatbot_messages_phone ON chatbot_messages(phone, channel, created_at DESC);

-- ------------------------------------------------------------
--  CHATBOT ESCALATIONS  (bot handed off to a human)
-- ------------------------------------------------------------
CREATE TABLE chatbot_escalations (
    id          SERIAL PRIMARY KEY,
    phone       VARCHAR(20)  NOT NULL,
    channel     VARCHAR(20)  NOT NULL DEFAULT 'whatsapp',
    reason      VARCHAR(100),
    status      VARCHAR(20)  NOT NULL DEFAULT 'open',
    resolved_by INTEGER      REFERENCES users(id),
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX idx_chatbot_escalations_status ON chatbot_escalations(status, created_at DESC);

-- ------------------------------------------------------------
--  AUDIT LOGS  (append-only — UPDATE/DELETE blocked in security.sql)
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    actor_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    actor_role      VARCHAR(30) NOT NULL,
    action          VARCHAR(80) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       INTEGER,
    patient_id      INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    details         JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_patient ON audit_logs(patient_id, created_at DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
