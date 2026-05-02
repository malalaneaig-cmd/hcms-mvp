import { Router } from 'express';
import * as ctrl from '../controllers/appointmentsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// PUBLIC: website booking channel — no auth required
router.post('/public', ctrl.publicBooking);

// Authenticated channels (reception / phone / staff dashboard)
router.use(requireAuth);

router.get('/',           ctrl.list);
router.post('/',          ctrl.create);
router.get('/:id',        ctrl.get);
router.patch('/:id/status', ctrl.updateStatus);
router.delete('/:id',     ctrl.remove);

export default router;
