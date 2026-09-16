import { pool } from '../config/db.js';
import { sendMessage } from '../services/whatsapp/provider.js';
import { logMessage } from '../services/whatsapp/conversationLog.js';
import { sendDueReminders } from '../services/reminders.js';

export async function listThreads(_req, res) {
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (m.phone, m.channel)
           m.phone,
           m.channel,
           m.body        AS last_body,
           m.direction   AS last_direction,
           m.created_at  AS last_at,
           (SELECT COUNT(*) FROM chatbot_escalations e
             WHERE e.phone = m.phone AND e.channel = m.channel AND e.status = 'open'
           )::int AS open_escalations
      FROM chatbot_messages m
     ORDER BY m.phone, m.channel, m.created_at DESC
     LIMIT 200
  `);
  res.json(rows);
}

export async function getThread(req, res) {
  const phone = decodeURIComponent(req.params.phone);
  const channel = req.query.channel || null;
  const params = [phone];
  let sql = `
    SELECT id, phone, channel, direction, body, created_at
      FROM chatbot_messages
     WHERE phone = $1`;
  if (channel) {
    params.push(channel);
    sql += ` AND channel = $2`;
  }
  sql += ` ORDER BY created_at ASC LIMIT 500`;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
}

export async function replyToThread(req, res) {
  const phone = decodeURIComponent(req.params.phone);
  const { message, channel = 'whatsapp' } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message is required' });

  await sendMessage(phone, message, channel);
  await logMessage({ phone, channel, direction: 'out', body: message });
  res.json({ ok: true });
}

export async function listEscalations(req, res) {
  const status = req.query.status || 'open';
  const { rows } = await pool.query(
    `SELECT * FROM chatbot_escalations
      WHERE status = $1
      ORDER BY created_at DESC
      LIMIT 100`,
    [status]
  );
  res.json(rows);
}

export async function resolveEscalation(req, res) {
  const { rows } = await pool.query(
    `UPDATE chatbot_escalations
        SET status = 'resolved',
            resolved_by = $1,
            resolved_at = NOW()
      WHERE id = $2
      RETURNING *`,
    [req.user.id, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Escalation not found' });
  res.json(rows[0]);
}

export async function runReminders(_req, res) {
  const result = await sendDueReminders();
  res.json(result);
}
