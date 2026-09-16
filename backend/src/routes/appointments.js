import { Router } from 'express';
import * as ctrl from '../controllers/appointmentsController.js';
import { requireAuth } from '../middleware/auth.js';
import { attachDbContext } from '../middleware/dbContext.js';
import { publicBookingLimiter } from '../middleware/rateLimit.js';

const router = Router();

// PUBLIC: website booking channel — no auth required
router.get('/booking-limits', ctrl.bookingLimits);
router.get('/slots', ctrl.availableSlots);
router.post('/public', publicBookingLimiter, ctrl.publicBooking);

// Authenticated channels (reception / phone / staff dashboard)
router.use(requireAuth, attachDbContext);

router.get('/',           ctrl.list);
router.post('/',          ctrl.create);
router.get('/:id',        ctrl.get);
router.patch('/:id/status', ctrl.updateStatus);
router.delete('/:id',     ctrl.remove);

export default router;
