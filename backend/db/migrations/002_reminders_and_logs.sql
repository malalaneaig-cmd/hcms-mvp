-- ============================================================
--  002: Appointment reminders + chatbot conversation logs
-- ============================================================

-- Track which appointments have been reminded
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMP;

-- ────────────────────────────────────────────────────────────
--  Chatbot message log — every message in and out
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chatbot_messages (
    id          SERIAL PRIMARY KEY,
    phone       VARCHAR(20)  NOT NULL,
    channel     VARCHAR(20)  NOT NULL DEFAULT 'whatsapp',
    direction   VARCHAR(10)  NOT NULL,              -- 'in' | 'out'
    body        TEXT         NOT NULL,
    session_id  INTEGER      REFERENCES chatbot_sessions(id) ON DELETE SET NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_phone
  ON chatbot_messages(phone, channel, created_at DESC);

-- ────────────────────────────────────────────────────────────
--  Escalation queue — conversations the bot couldn't handle
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chatbot_escalations (
    id          SERIAL PRIMARY KEY,
    phone       VARCHAR(20)  NOT NULL,
    channel     VARCHAR(20)  NOT NULL DEFAULT 'whatsapp',
    reason      VARCHAR(100),
    status      VARCHAR(20)  NOT NULL DEFAULT 'open',  -- open | resolved
    resolved_by INTEGER      REFERENCES users(id),
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chatbot_escalations_status
  ON chatbot_escalations(status, created_at DESC);
