-- See db/schema.sql + db/security.sql for full security model.
-- Summary: patient_profiles (PHI), audit_logs, RLS, hcms_app role, soft deletes.

ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE patients DROP COLUMN IF EXISTS notes;

CREATE TABLE IF NOT EXISTS patient_profiles (
    patient_id       INTEGER PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
    clinical_notes   TEXT,
    allergies        TEXT,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS audit_logs (
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
