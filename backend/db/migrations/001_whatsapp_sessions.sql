-- ============================================================
--  WhatsApp / SMS chatbot conversation sessions
--  Tracks the state of each ongoing booking conversation.
-- ============================================================

CREATE TABLE IF NOT EXISTS chatbot_sessions (
    id              SERIAL PRIMARY KEY,
    phone           VARCHAR(20)  NOT NULL,
    channel         VARCHAR(20)  NOT NULL DEFAULT 'whatsapp',  -- whatsapp | sms
    state           VARCHAR(30)  NOT NULL DEFAULT 'greeting',
    patient_name    VARCHAR(100),
    doctor_id       INTEGER REFERENCES doctors(id),
    chosen_date     DATE,
    chosen_time     TIME,
    appointment_id  INTEGER REFERENCES appointments(id),
    expires_at      TIMESTAMP    NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes'),
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chatbot_sessions_phone   ON chatbot_sessions(phone, channel);
CREATE INDEX idx_chatbot_sessions_expires ON chatbot_sessions(expires_at);
