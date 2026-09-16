import { runWithDbContext, systemDbContext } from '../config/dbContext.js';

import { handleIncomingMessage } from '../services/whatsapp/chatbot.js';

import { sendMessage, verifyWebhookSignature } from '../services/whatsapp/provider.js';



async function withSystemContext(fn) {

  return runWithDbContext(systemDbContext(), fn);

}



export async function incomingWhatsApp(req, res) {

  if (!verifyWebhookSignature(req)) {

    return res.status(401).json({ error: 'Invalid webhook signature' });

  }



  const { phone, message } = normalizePayload(req.body);

  if (!phone || !message) {

    return res.status(400).json({ error: 'phone and message are required' });

  }



  const reply = await withSystemContext(() =>

    handleIncomingMessage({ phone, text: message, channel: 'whatsapp' })

  );



  await sendMessage(phone, reply, 'whatsapp');

  res.json({ reply });

}



export async function incomingSms(req, res) {

  const { phone, message } = normalizePayload(req.body);

  if (!phone || !message) {

    return res.status(400).json({ error: 'phone and message are required' });

  }



  const reply = await withSystemContext(() =>

    handleIncomingMessage({ phone, text: message, channel: 'sms' })

  );



  await sendMessage(phone, reply, 'sms');

  res.json({ reply });

}



export async function testSimulator(req, res) {

  const { phone, message, channel } = req.body;

  if (!phone || !message) {

    return res.status(400).json({ error: 'phone and message are required' });

  }



  const reply = await withSystemContext(() =>

    handleIncomingMessage({

      phone,

      text: message,

      channel: channel || 'whatsapp',

    })

  );



  res.json({

    from:    'bot',

    to:      phone,

    channel: channel || 'whatsapp',

    reply,

  });

}



function normalizePayload(body) {

  if (body.phone && body.message) {

    return { phone: body.phone, message: body.message };

  }

  if (body.from && body.text) {

    return { phone: body.from, message: body.text };

  }

  if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {

    const msg = body.entry[0].changes[0].value.messages[0];

    return { phone: msg.from, message: msg.text?.body || '' };

  }

  return { phone: null, message: null };

}


