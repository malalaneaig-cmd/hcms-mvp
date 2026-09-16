-- ============================================================
--  HCMS — Application role, RLS policies, audit immutability
--  Run as PostgreSQL superuser after schema.sql
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hcms_app') THEN
    CREATE ROLE hcms_app LOGIN PASSWORD 'hcms_app';
  END IF;
END $$;

GRANT CONNECT ON DATABASE hcms TO hcms_app;
GRANT USAGE ON SCHEMA public TO hcms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hcms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hcms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hcms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO hcms_app;

-- Immutable audit trail
REVOKE UPDATE, DELETE ON audit_logs FROM hcms_app;
GRANT INSERT, SELECT ON audit_logs TO hcms_app;

CREATE OR REPLACE FUNCTION app_role() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.role', true), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_doctor_id() RETURNS integer AS $$
  SELECT NULLIF(current_setting('app.doctor_id', true), '')::integer;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION doctor_can_access_patient(p_patient_id integer) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM appointments a
     WHERE a.patient_id = p_patient_id
       AND a.doctor_id = app_doctor_id()
  );
$$ LANGUAGE sql STABLE;

-- ─── PATIENTS ───────────────────────────────────────────────
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;

CREATE POLICY patients_admin_staff ON patients FOR ALL
  USING (app_role() IN ('admin', 'staff'))
  WITH CHECK (app_role() IN ('admin', 'staff'));

CREATE POLICY patients_doctor_read ON patients FOR SELECT
  USING (app_role() = 'doctor' AND app_doctor_id() IS NOT NULL AND doctor_can_access_patient(id));

CREATE POLICY patients_system ON patients FOR ALL
  USING (app_role() = 'system')
  WITH CHECK (app_role() = 'system');

-- ─── PATIENT PROFILES (PHI) ─────────────────────────────────
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY profiles_admin_staff ON patient_profiles FOR ALL
  USING (app_role() IN ('admin', 'staff'))
  WITH CHECK (app_role() IN ('admin', 'staff'));

CREATE POLICY profiles_doctor_read ON patient_profiles FOR SELECT
  USING (app_role() = 'doctor' AND app_doctor_id() IS NOT NULL AND doctor_can_access_patient(patient_id));

CREATE POLICY profiles_doctor_update ON patient_profiles FOR UPDATE
  USING (app_role() = 'doctor' AND app_doctor_id() IS NOT NULL AND doctor_can_access_patient(patient_id))
  WITH CHECK (app_role() = 'doctor' AND app_doctor_id() IS NOT NULL AND doctor_can_access_patient(patient_id));

CREATE POLICY profiles_system ON patient_profiles FOR ALL
  USING (app_role() = 'system')
  WITH CHECK (app_role() = 'system');

-- ─── APPOINTMENTS ───────────────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

CREATE POLICY appt_admin_staff ON appointments FOR ALL
  USING (app_role() IN ('admin', 'staff'))
  WITH CHECK (app_role() IN ('admin', 'staff'));

CREATE POLICY appt_doctor ON appointments FOR SELECT
  USING (app_role() = 'doctor' AND doctor_id = app_doctor_id());

CREATE POLICY appt_system ON appointments FOR ALL
  USING (app_role() = 'system')
  WITH CHECK (app_role() = 'system');

-- ─── NOTES ──────────────────────────────────────────────────
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes FORCE ROW LEVEL SECURITY;

CREATE POLICY notes_admin_staff ON notes FOR ALL
  USING (app_role() IN ('admin', 'staff'))
  WITH CHECK (app_role() IN ('admin', 'staff'));

CREATE POLICY notes_doctor ON notes FOR ALL
  USING (app_role() = 'doctor' AND app_doctor_id() IS NOT NULL AND doctor_can_access_patient(patient_id))
  WITH CHECK (app_role() = 'doctor' AND app_doctor_id() IS NOT NULL AND doctor_can_access_patient(patient_id));

CREATE POLICY notes_system ON notes FOR ALL
  USING (app_role() = 'system')
  WITH CHECK (app_role() = 'system');

-- ─── INVOICES ───────────────────────────────────────────────
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY invoices_admin_staff ON invoices FOR ALL
  USING (app_role() IN ('admin', 'staff'))
  WITH CHECK (app_role() IN ('admin', 'staff'));

CREATE POLICY invoices_doctor_read ON invoices FOR SELECT
  USING (app_role() = 'doctor' AND app_doctor_id() IS NOT NULL AND doctor_can_access_patient(patient_id));

CREATE POLICY invoices_system ON invoices FOR ALL
  USING (app_role() = 'system')
  WITH CHECK (app_role() = 'system');

-- ─── AUDIT LOGS ─────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_insert ON audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY audit_admin_read ON audit_logs FOR SELECT
  USING (app_role() = 'admin');

-- Block mutations via rules (defense in depth)
DROP RULE IF EXISTS audit_logs_no_update ON audit_logs;
DROP RULE IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
