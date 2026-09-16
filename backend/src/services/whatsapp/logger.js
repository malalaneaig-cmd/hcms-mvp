import { pool } from '../../config/db.js';

/**
 * Log every chatbot message (incoming and outgoing) for staff visibility.
 */
export async function logMessage({ phone, channel, direction, body, sessionId }) {
  try {
    await pool.query(
      `INSERT INTO chatbot_messages (phone, channel, direction, body, session_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [phone, channel, direction, body, sessionId || null]
    );
  } catch (err) {
    console.error('[logger] failed to log message:', err.message);
  }
}

/**
 * Create an escalation ticket when the bot can't handle a conversation.
 */
export async function createEscalation({ phone, channel, reason }) {
  try {
    // Avoid duplicate open escalations for the same phone
    const existing = await pool.query(
      `SELECT id FROM chatbot_escalations
        WHERE phone = $1 AND channel = $2 AND status = 'open'
        LIMIT 1`,
      [phone, channel]
    );
    if (existing.rows[0]) return existing.rows[0];

    const { rows } = await pool.query(
      `INSERT INTO chatbot_escalations (phone, channel, reason)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [phone, channel, reason || 'Bot could not complete booking']
    );
    return rows[0];
  } catch (err) {
    console.error('[logger] failed to create escalation:', err.message);
  }
}
