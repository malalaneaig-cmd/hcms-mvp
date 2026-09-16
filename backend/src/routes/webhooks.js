import { Router } from 'express';
import * as ctrl from '../controllers/webhooksController.js';
import { webhookTestLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Provider webhook endpoints (no auth — providers can't send JWTs)
router.post('/whatsapp', ctrl.incomingWhatsApp);
router.post('/sms',      ctrl.incomingSms);

// Local test simulator — available whenever we are not live with Africala
if (process.env.NODE_ENV !== 'production' || (process.env.WHATSAPP_PROVIDER || 'local') === 'local') {
  router.post('/test', webhookTestLimiter, ctrl.testSimulator);
}

// WhatsApp webhook verification (GET) — some providers send a challenge
router.get('/whatsapp', (req, res) => {
  const challenge = req.query['hub.challenge'] || req.query.challenge;
  if (challenge) return res.send(challenge);
  res.json({ status: 'webhook active' });
});

export default router;
