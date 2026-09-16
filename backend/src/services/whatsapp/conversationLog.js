import { pool } from '../../config/db.js';

export async function logMessage({ phone, channel, direction, body, session_id = null }) {
  try {
    await pool.query(
      `INSERT INTO chatbot_messages (phone, channel, direction, body, session_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [phone, channel, direction, body, session_id]
    );
  } catch (err) {
    console.error('[conversationLog]', err.message);
  }
}

export async function createEscalation(phone, channel, reason) {
  const { rows: existing } = await pool.query(
    `SELECT id FROM chatbot_escalations
      WHERE phone = $1 AND channel = $2 AND status = 'open'
      LIMIT 1`,
    [phone, channel]
  );
  if (existing[0]) return existing[0];

  const { rows } = await pool.query(
    `INSERT INTO chatbot_escalations (phone, channel, reason)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [phone, channel, reason]
  );
  return rows[0];
}
