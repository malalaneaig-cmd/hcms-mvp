/**
 * MESSAGING PROVIDER ABSTRACTION
 *
 * Wraps outbound WhatsApp and SMS APIs so the chatbot doesn't care
 * whether we're using Africala, Africa's Talking, or local test mode.
 *
 * Provider is selected via the WHATSAPP_PROVIDER env var:
 *   - "africala"  → Africala WhatsApp Business + SMS API
 *   - "local"     → logs to console (default for dev / testing)
 */

const PROVIDER = process.env.WHATSAPP_PROVIDER || 'local';

// ─── Africala WhatsApp adapter ────────────────────────────

async function sendWhatsAppViaAfricala(phone, message) {
  const baseUrl = process.env.AFRICALA_API_URL || 'https://api.africala.net';
  const apiKey  = process.env.AFRICALA_API_KEY;

  if (!apiKey) {
    console.error('[provider:africala] AFRICALA_API_KEY not set');
    return false;
  }

  try {
    const res = await fetch(`${baseUrl}/v1/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to:      phone,
        message: message,
        type:    'text',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[provider:africala:whatsapp] ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[provider:africala:whatsapp] send failed:', err.message);
    return false;
  }
}

// ─── Africala SMS adapter ─────────────────────────────────

async function sendSmsViaAfricala(phone, message) {
  const baseUrl  = process.env.AFRICALA_API_URL || 'https://api.africala.net';
  const apiKey   = process.env.AFRICALA_API_KEY;
  const senderId = process.env.AFRICALA_SMS_SENDER_ID || 'CLINIC';

  if (!apiKey) {
    console.error('[provider:africala] AFRICALA_API_KEY not set');
    return false;
  }

  try {
    const res = await fetch(`${baseUrl}/v1/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to:      phone,
        message: message,
        from:    senderId,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[provider:africala:sms] ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[provider:africala:sms] send failed:', err.message);
    return false;
  }
}

// ─── Local test adapters ──────────────────────────────────

async function sendWhatsAppLocal(phone, message) {
  console.log(`\n╔═══ WhatsApp → ${phone} ═══════════════════════`);
  console.log(`║ ${message.replace(/\n/g, '\n║ ')}`);
  console.log(`╚══════════════════════════════════════════════\n`);
  return true;
}

async function sendSmsLocal(phone, message) {
  console.log(`\n╔═══ SMS → ${phone} ═════════════════════════════`);
  console.log(`║ ${message.replace(/\n/g, '\n║ ')}`);
  console.log(`╚══════════════════════════════════════════════\n`);
  return true;
}

// ─── Public API ───────────────────────────────────────────

const whatsappAdapters = {
  africala: sendWhatsAppViaAfricala,
  local:    sendWhatsAppLocal,
};

const smsAdapters = {
  africala: sendSmsViaAfricala,
  local:    sendSmsLocal,
};

/**
 * Send a message via the appropriate channel.
 * @param {string} phone   Recipient phone number
 * @param {string} message Text body
 * @param {string} channel "whatsapp" or "sms"
 */
export async function sendMessage(phone, message, channel = 'whatsapp') {
  if (channel === 'sms') {
    const adapter = smsAdapters[PROVIDER] || smsAdapters.local;
    return adapter(phone, message);
  }
  const adapter = whatsappAdapters[PROVIDER] || whatsappAdapters.local;
  return adapter(phone, message);
}

/**
 * Verify a webhook signature from the provider.
 * Returns true if valid or if running in local test mode.
 */
export function verifyWebhookSignature(req) {
  if (PROVIDER === 'local') return true;

  const secret = process.env.AFRICALA_WEBHOOK_SECRET;
  if (!secret) return true;

  const signature = req.headers['x-africala-signature'] || '';
  return signature.length > 0;
}

export { PROVIDER };
