-- Weekly working hours per doctor (multiple blocks per weekday for lunch breaks)
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id          SERIAL PRIMARY KEY,
    doctor_id   INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    weekday     SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON doctor_schedules(doctor_id, weekday);
